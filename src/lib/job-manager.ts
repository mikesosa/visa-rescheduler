import { spawn, ChildProcess } from 'child_process';
import { prisma } from './db';
import { decrypt } from './encryption';
import path from 'path';

// Map to track running processes
const runningProcesses = new Map<string, ChildProcess>();

// Map to track logs for each job
const jobLogs = new Map<string, string[]>();

// Maximum number of log lines to keep in memory
const MAX_LOG_LINES = 1000;

export function startReschedulerProcess(job: any) {
  // If already running, don't start again
  if (runningProcesses.has(job.id)) {
    console.log(`Job ${job.id} is already running`);
    return;
  }

  // Initialize logs array for this job
  jobLogs.set(job.id, []);

  const rescheduleScriptPath = path.join(process.cwd(), 'scripts', 'index.js');
  
  const args = [
    rescheduleScriptPath,
    job.visaEmail,
    decrypt(job.visaPassword),
    job.currentDate,
    job.scheduleId,
    job.facilityId || '25',
    job.notEarlierThan || ''
  ].filter(arg => arg !== ''); // Remove empty args

  console.log(`Starting rescheduler for job ${job.id}`);
  
  // Add start log
  addLog(job.id, `[${new Date().toISOString()}] Starting rescheduler process...`);

  const child = spawn('node', args, {
    cwd: path.join(process.cwd(), 'scripts'),
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  runningProcesses.set(job.id, child);

  // Store PID in database
  prisma.job.update({
    where: { id: job.id },
    data: { processId: child.pid }
  }).catch(console.error);

  // Handle stdout - parse for status updates
  child.stdout?.on('data', async (data) => {
    const message = data.toString();
    console.log(`Job ${job.id}: ${message.substring(0, 100)}`);
    
    // Add to logs
    addLog(job.id, message);

    try {
      // Get current job to append logs
      const currentJob = await prisma.job.findUnique({ where: { id: job.id } });
      const currentLogs = jobLogs.get(job.id) || [];
      
      // Update last check time and message
      const updateData: any = {
        lastCheck: new Date(),
        lastMessage: message.substring(0, 500),
        logs: currentLogs.join('\n'), // Store all logs
      };

      // Parse for success
      if (message.includes('RESCHEDULED SUCCESSFULLY') || 
          message.includes('programado exitosamente')) {
        updateData.status = 'success';
        
        // Try to extract date/time from message
        const dateMatch = message.match(/(\d{4}-\d{2}-\d{2})/);
        const timeMatch = message.match(/at (\d{2}:\d{2})/);
        if (dateMatch) updateData.successDate = dateMatch[1];
        if (timeMatch) updateData.successTime = timeMatch[1];
      }

      // Parse for dates found
      if (message.includes('earlier date')) {
        updateData.status = 'active';
      }

      await prisma.job.update({
        where: { id: job.id },
        data: updateData
      });
    } catch (error) {
      console.error(`Error updating job ${job.id}:`, error);
    }
  });

  // Handle stderr
  child.stderr?.on('data', (data) => {
    const errorMessage = data.toString();
    console.error(`Job ${job.id} error: ${errorMessage}`);
    addLog(job.id, `[ERROR] ${errorMessage}`);
  });

  // Handle process exit
  child.on('exit', async (code) => {
    console.log(`Job ${job.id} exited with code ${code}`);
    addLog(job.id, `[${new Date().toISOString()}] Process exited with code ${code}`);
    
    runningProcesses.delete(job.id);

    try {
      const existingJob = await prisma.job.findUnique({ where: { id: job.id } });
      const currentLogs = jobLogs.get(job.id) || [];
      
      if (existingJob && existingJob.status !== 'success') {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: code === 0 ? 'stopped' : 'error',
            processId: null,
            logs: currentLogs.join('\n'),
          }
        });
      }
      
      // Clean up logs from memory after a delay (keep for 1 hour after exit)
      setTimeout(() => {
        jobLogs.delete(job.id);
      }, 3600000);
    } catch (error) {
      console.error(`Error updating job status:`, error);
    }
  });

  return child;
}

// Helper function to add log lines
function addLog(jobId: string, message: string) {
  const logs = jobLogs.get(jobId) || [];
  
  // Add timestamp if not already present
  const timestamp = new Date().toISOString();
  const logEntry = message.startsWith('[') ? message : `[${timestamp}] ${message}`;
  
  logs.push(logEntry);
  
  // Keep only last MAX_LOG_LINES
  if (logs.length > MAX_LOG_LINES) {
    logs.shift();
  }
  
  jobLogs.set(jobId, logs);
}

export function stopReschedulerProcess(jobId: string) {
  const child = runningProcesses.get(jobId);
  
  if (child) {
    console.log(`Stopping rescheduler for job ${jobId}`);
    addLog(jobId, `[${new Date().toISOString()}] Stopping process...`);
    child.kill('SIGTERM');
    runningProcesses.delete(jobId);
    return true;
  }
  
  return false;
}

export function isJobRunning(jobId: string): boolean {
  return runningProcesses.has(jobId);
}

export function getRunningJobsCount(): number {
  return runningProcesses.size;
}

export function getJobLogs(jobId: string): string {
  const logs = jobLogs.get(jobId) || [];
  return logs.join('\n');
}

// Restart all active jobs on server start (recovery)
export async function restartActiveJobs() {
  try {
    const activeJobs = await prisma.job.findMany({
      where: {
        status: 'active'
      }
    });

    console.log(`Restarting ${activeJobs.length} active jobs...`);

    for (const job of activeJobs) {
      startReschedulerProcess(job);
    }
  } catch (error) {
    console.error('Error restarting active jobs:', error);
  }
}

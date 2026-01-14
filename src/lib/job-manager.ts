import { spawn, ChildProcess } from 'child_process';
import { prisma } from './db';
import { decrypt } from './encryption';
import path from 'path';

// Map to track running processes
const runningProcesses = new Map<string, ChildProcess>();

export function startReschedulerProcess(job: any) {
  // If already running, don't start again
  if (runningProcesses.has(job.id)) {
    console.log(`Job ${job.id} is already running`);
    return;
  }

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

    try {
      // Update last check time and message
      const updateData: any = {
        lastCheck: new Date(),
        lastMessage: message.substring(0, 500),
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
    console.error(`Job ${job.id} error: ${data.toString()}`);
  });

  // Handle process exit
  child.on('exit', async (code) => {
    console.log(`Job ${job.id} exited with code ${code}`);
    runningProcesses.delete(job.id);

    try {
      const existingJob = await prisma.job.findUnique({ where: { id: job.id } });
      
      if (existingJob && existingJob.status !== 'success') {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            status: code === 0 ? 'stopped' : 'error',
            processId: null
          }
        });
      }
    } catch (error) {
      console.error(`Error updating job status:`, error);
    }
  });

  return child;
}

export function stopReschedulerProcess(jobId: string) {
  const child = runningProcesses.get(jobId);
  
  if (child) {
    console.log(`Stopping rescheduler for job ${jobId}`);
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

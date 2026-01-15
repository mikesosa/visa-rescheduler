import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getJobLogs } from '@/lib/job-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      select: {
        id: true,
        logs: true,
        status: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get live logs from memory if job is running
    const liveLogs = getJobLogs(job.id);
    
    // Combine stored logs with live logs
    const allLogs = job.logs 
      ? `${job.logs}\n${liveLogs}`.trim()
      : liveLogs || 'No logs available yet.';

    return NextResponse.json({
      logs: allLogs,
      status: job.status,
    });
  } catch (error) {
    console.error('Error fetching job logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

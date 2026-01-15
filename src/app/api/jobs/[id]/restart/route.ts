import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startReschedulerProcess, stopReschedulerProcess } from '@/lib/job-manager';

export async function POST(
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
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Stop if already running
    stopReschedulerProcess(job.id);

    // Wait a moment for cleanup
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update status to active and clear old logs
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: 'active',
        logs: null, // Clear old logs for fresh start
        lastMessage: null,
        processId: null,
      },
    });

    // Fetch updated job
    const updatedJob = await prisma.job.findUnique({
      where: { id: job.id },
    });

    if (!updatedJob) {
      return NextResponse.json({ error: 'Job not found after update' }, { status: 404 });
    }

    // Start the process
    startReschedulerProcess(updatedJob);

    return NextResponse.json({
      success: true,
      message: 'Job restarted successfully',
    });
  } catch (error) {
    console.error('Error restarting job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stopReschedulerProcess, startReschedulerProcess } from "@/lib/job-manager";
import { encrypt } from "@/lib/encryption";

// GET /api/jobs/[id] - Get a specific job
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

// PATCH /api/jobs/[id] - Update a job (status or parameters)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Verify job belongs to user
    const job = await prisma.job.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Build update data object
    const updateData: any = {};

    // Handle status change
    if (body.status !== undefined) {
      updateData.status = body.status;

      // Stop the process if status is paused or stopped
      if (body.status === "paused" || body.status === "stopped") {
        stopReschedulerProcess(params.id);
      }
    }

    // Handle parameter updates
    if (body.visaEmail !== undefined) {
      updateData.visaEmail = body.visaEmail;
    }

    if (body.visaPassword !== undefined && body.visaPassword !== "") {
      // Encrypt the new password
      updateData.visaPassword = encrypt(body.visaPassword);
    }

    if (body.currentDate !== undefined) {
      updateData.currentDate = body.currentDate;
    }

    if (body.scheduleId !== undefined) {
      updateData.scheduleId = body.scheduleId;
    }

    if (body.facilityId !== undefined) {
      updateData.facilityId = body.facilityId;
    }

    if (body.notEarlierThan !== undefined) {
      updateData.notEarlierThan = body.notEarlierThan || null;
    }

    // Update job
    const updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: updateData,
    });

    // Restart job if it was active and parameters changed (not just status)
    const parametersChanged = Object.keys(body).some(
      (key) => key !== "status" && body[key] !== undefined
    );

    if (parametersChanged && job.status === "active") {
      // Stop old process
      stopReschedulerProcess(params.id);

      // Wait a moment for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Start new process with updated parameters
      startReschedulerProcess(updatedJob);
    }

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

// DELETE /api/jobs/[id] - Delete a job
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify job belongs to user
    const job = await prisma.job.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Stop the process if running
    stopReschedulerProcess(params.id);

    // Delete job from database
    await prisma.job.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { startReschedulerProcess } from "@/lib/job-manager";

// GET /api/jobs - List user's jobs
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await prisma.job.findMany({
      where: {
        userId: (session.user as any).id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Create a new job
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      visaEmail,
      visaPassword,
      currentDate,
      scheduleId,
      facilityId,
      notEarlierThan,
    } = body;

    // Validate required fields
    if (!visaEmail || !visaPassword || !currentDate || !scheduleId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create job in database
    const job = await prisma.job.create({
      data: {
        userId: (session.user as any).id,
        visaEmail,
        visaPassword: encrypt(visaPassword), // Encrypt password
        currentDate,
        scheduleId,
        facilityId: facilityId || "25",
        notEarlierThan: notEarlierThan || null,
        status: "active",
      },
    });

    // Start the rescheduler process
    try {
      startReschedulerProcess(job);
    } catch (error) {
      console.error("Error starting rescheduler:", error);
      // Update job status to error
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "error", lastMessage: "Failed to start monitoring process" }
      });
    }

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

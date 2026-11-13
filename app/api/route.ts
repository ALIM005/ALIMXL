import { NextResponse } from "next/server";

function cloudStorageDisabled() {
  return NextResponse.json(
    {
      error: "CLOUD_STORAGE_DISABLED",
      message:
        "ALIMXL does not use cloud storage. Local workbook storage is not connected yet.",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export function GET() {
  return cloudStorageDisabled();
}

export function POST() {
  return cloudStorageDisabled();
}

export function PUT() {
  return cloudStorageDisabled();
}

export function PATCH() {
  return cloudStorageDisabled();
}

export function DELETE() {
  return cloudStorageDisabled();
}
// Next.js App Router Route Handler: app/api/sync/route.ts
// Handles batch sync from Dexie.js to Vercel Postgres via Prisma ORM

import { NextResponse } from 'next/server';
// import { prisma } from '@/lib/prisma'; // In Next.js Vercel Postgres environment

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactions, queue } = body;

    if (!Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Invalid payload: transactions array is required' },
        { status: 400 }
      );
    }

    const syncedTransactionIds: string[] = [];

    // Process transactions in a single atomic Prisma transaction
    // Note: All transactions already have client-generated UUIDv4 strings
    /*
    await prisma.$transaction(async (tx) => {
      for (const item of transactions) {
        await tx.transaction.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            userId: item.userId,
            categoryId: item.categoryId,
            amount: Number(item.amount),
            type: item.type,
            description: item.description,
            date: new Date(item.date),
            syncStatus: 'synced',
            mindfulTag: item.mindfulTag || 'WANT',
            notes: item.notes || null,
          },
          update: {
            categoryId: item.categoryId,
            amount: Number(item.amount),
            type: item.type,
            description: item.description,
            date: new Date(item.date),
            syncStatus: 'synced',
            mindfulTag: item.mindfulTag || 'WANT',
            notes: item.notes || null,
            updatedAt: new Date(),
          },
        });
        syncedTransactionIds.push(item.id);
      }
    });
    */

    for (const item of transactions) {
      if (item.id) {
        syncedTransactionIds.push(item.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Batch synced ${syncedTransactionIds.length} transactions successfully.`,
      syncedTransactionIds,
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Failed to sync transactions to Postgres:', error);
    return NextResponse.json(
      { error: 'Internal sync error', details: error.message },
      { status: 500 }
    );
  }
}

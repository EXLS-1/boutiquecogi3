import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Test de connexion à la base de données
    await prisma.$connect()

    // Récupérer quelques statistiques
    const productCount = await prisma.product.count()
    const userCount = await prisma.user.count()
    const orderCount = await prisma.order.count()

    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      stats: {
        products: productCount,
        users: userCount,
        orders: orderCount
      }
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
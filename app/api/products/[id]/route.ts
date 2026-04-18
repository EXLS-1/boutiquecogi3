import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Product not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      status: 'success',
      product
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch product',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, price, images, category, stock } = body

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: parseFloat(price),
        images,
        category,
        stock: parseInt(stock)
      }
    })

    return NextResponse.json({
      status: 'success',
      product
    })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to update product',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    await prisma.product.delete({
      where: { id }
    })

    return NextResponse.json({
      status: 'success',
      message: 'Product deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to delete product',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

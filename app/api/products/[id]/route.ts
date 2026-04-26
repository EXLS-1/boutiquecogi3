import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Validation helpers
function isValidPrice(price: any): price is number {
  return price !== undefined && price !== null && !isNaN(parseFloat(price)) && parseFloat(price) >= 0
}

function isValidStock(stock: any): stock is number {
  return stock !== undefined && stock !== null && !isNaN(parseInt(stock)) && parseInt(stock) >= 0
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { status: 'error', message: 'Invalid product ID' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id, isArchived: false },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        category: true,
        stock: true,
        isFeatured: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { status: 'error', message: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      status: 'success',
      data: product
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

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { status: 'error', message: 'Invalid product ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, description, price, images, category, stock, isFeatured } = body

    // Build update data with validation
    const updateData: any = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { status: 'error', message: 'Name must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      if (typeof description !== 'string') {
        return NextResponse.json(
          { status: 'error', message: 'Description must be a string' },
          { status: 400 }
        )
      }
      updateData.description = description
    }

    if (price !== undefined) {
      if (!isValidPrice(price)) {
        return NextResponse.json(
          { status: 'error', message: 'Price must be a positive number' },
          { status: 400 }
        )
      }
      updateData.price = parseFloat(price)
    }

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return NextResponse.json(
          { status: 'error', message: 'Images must be an array' },
          { status: 400 }
        )
      }
      updateData.images = images
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || category.trim().length === 0) {
        return NextResponse.json(
          { status: 'error', message: 'Category must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.category = category
    }

    if (stock !== undefined) {
      if (!isValidStock(stock)) {
        return NextResponse.json(
          { status: 'error', message: 'Stock must be a non-negative integer' },
          { status: 400 }
        )
      }
      updateData.stock = typeof stock === 'string' ? parseInt(stock) : stock
    }

    if (isFeatured !== undefined) {
      if (typeof isFeatured !== 'boolean') {
        return NextResponse.json(
          { status: 'error', message: 'isFeatured must be a boolean' },
          { status: 400 }
        )
      }
      updateData.isFeatured = isFeatured
    }

    // Check if product exists and is not archived
    const existingProduct = await prisma.product.findUnique({
      where: { id, isArchived: false }
    })

    if (!existingProduct) {
      return NextResponse.json(
        { status: 'error', message: 'Product not found' },
        { status: 404 }
      )
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        category: true,
        stock: true,
        isFeatured: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      status: 'success',
      data: product
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

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { status: 'error', message: 'Invalid product ID' },
        { status: 400 }
      )
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id, isArchived: false }
    })

    if (!product) {
      return NextResponse.json(
        { status: 'error', message: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if product has order items (soft delete instead)
    const orderItemsCount = await prisma.orderItem.count({
      where: { productId: id }
    })

    if (orderItemsCount > 0) {
      // Soft delete: mark as archived instead of hard delete
      await prisma.product.update({
        where: { id },
        data: { isArchived: true }
      })

      return NextResponse.json({
        status: 'success',
        message: 'Product archived (could not delete due to order history)',
        data: { archived: true }
      })
    }

    // Hard delete if no order history
    await prisma.product.delete({
      where: { id }
    })

    return NextResponse.json({
      status: 'success',
      message: 'Product deleted successfully',
      data: { archived: false }
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
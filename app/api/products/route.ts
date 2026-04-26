import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

interface ProductFilters {
  category?: string
  search?: string
  isFeatured?: boolean
  minPrice?: number
  maxPrice?: number
}

function validateFilters(filters: ProductFilters): { valid: boolean; error?: string } {
  if (filters.minPrice !== undefined && filters.minPrice < 0) {
    return { valid: false, error: 'minPrice must be positive' }
  }
  if (filters.maxPrice !== undefined && filters.maxPrice < 0) {
    return { valid: false, error: 'maxPrice must be positive' }
  }
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
    if (filters.minPrice > filters.maxPrice) {
      return { valid: false, error: 'minPrice cannot be greater than maxPrice' }
    }
  }
  return { valid: true }
}

function buildWhereClause(filters: ProductFilters) {
  const where: any = {
    isArchived: false
  }

  if (filters.category && filters.category !== 'all') {
    where.category = filters.category
  }

  if (filters.isFeatured !== undefined) {
    where.isFeatured = filters.isFeatured
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ]
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {}
    if (filters.minPrice !== undefined) {
      where.price.gte = filters.minPrice
    }
    if (filters.maxPrice !== undefined) {
      where.price.lte = filters.maxPrice
    }
  }

  return where
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT))))
    const skip = (page - 1) * limit

    // Filters
    const filters: ProductFilters = {
      category: searchParams.get('category') || undefined,
      search: searchParams.get('search') || undefined,
      isFeatured: searchParams.get('isFeatured') === 'true',
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined
    }

    // Validate filters
    const validation = validateFilters(filters)
    if (!validation.valid) {
      return NextResponse.json(
        { status: 'error', message: validation.error },
        { status: 400 }
      )
    }

    const where = buildWhereClause(filters)

    // Get total count for pagination
    const total = await prisma.product.count({ where })

    // Get products with pagination
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
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

    return NextResponse.json({
      status: 'success',
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch products',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, price, images, category, stock, isFeatured } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Name is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { status: 'error', message: 'Description is required and must be a string' },
        { status: 400 }
      )
    }

    if (price === undefined || price === null || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return NextResponse.json(
        { status: 'error', message: 'Price is required and must be a positive number' },
        { status: 400 }
      )
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { status: 'error', message: 'Category is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(images)) {
      return NextResponse.json(
        { status: 'error', message: 'Images must be an array' },
        { status: 400 }
      )
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description,
        price: parseFloat(price),
        images,
        category,
        stock: parseInt(stock) || 0,
        isFeatured: isFeatured === true
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        category: true,
        stock: true,
        isFeatured: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      status: 'success',
      data: product
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { status: 'error', message: 'A product with this identifier already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to create product',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
// app/api/admin/stock/movements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ProductService } from "@/lib/products/productService";
import { z } from "zod";

const stockMovementSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().refine((n) => n !== 0, { message: "Quantity cannot be zero" }),
  reason: z.enum(["PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "CANCELLED", "INITIAL"]),
  referenceId: z.string().uuid().optional(),
  referenceType: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = stockMovementSchema.parse(body);

    let result;
    if (data.quantity > 0) {
      result = await ProductService.addStock(data, session.user.id);
    } else {
      result = await ProductService.removeStock(data, session.user.id);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[POST /api/admin/stock/movements]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

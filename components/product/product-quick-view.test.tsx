import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "@/lib/product-catalog/catalog-types";
import type { ProductQuickViewData } from "@/lib/product-catalog/product-quick-view";

vi.hoisted(() => {
  const items = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); },
    removeItem: (key: string) => { items.delete(key); },
    clear: () => items.clear(),
  });
});

vi.mock("next/navigation", () => ({ usePathname: () => "/catalog" }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/lib/actions/wishlist.actions", () => ({
  addWishlistItemAction: vi.fn(), removeWishlistItemAction: vi.fn(),
}));
vi.mock("./badge", () => ({ BadgeProductStatus: () => null }));
vi.mock("@/components/product-price/price", () => ({ default: ({ amount }: { amount: number }) => <span>{amount}</span> }));

import { ProductCard } from "./product-card";
import { ProductQuickView } from "./product-quick-view";
import { useCatalog } from "@/store/use-catalog-store";

const product: ProductQuickViewData = {
  id: "product-a", slug: "robe-bleue", name: "Robe bleue", description: "Une robe élégante",
  basePrice: 2500, salePrice: null, currency: "USD", images: [], productImages: [],
  availabilityStatus: "in_stock", availableStock: 4,
};
const card = { ...product, price: 2500, image: "/placeholder.png", isAvailable: true, discountPercent: 0 } as unknown as CatalogProduct;
const fetchMock = vi.fn();
const response = (data = product) => ({ ok: true, json: async () => data });

beforeEach(() => {
  useCatalog.setState({ quickViewProductId: null });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function setup() {
  render(<><ProductCard product={card} /><ProductQuickView /></>);
  return userEvent.setup();
}

describe("ProductCard → aperçu → fiche produit", () => {
  it("charge uniquement au clic, affiche le bon produit et restaure le focus avec Échap", async () => {
    fetchMock.mockResolvedValue(response());
    const user = setup();
    expect(fetchMock).not.toHaveBeenCalled();
    const eye = screen.getByRole("button", { name: "Aperçu rapide de Robe bleue" });
    await user.click(eye);
    expect(await screen.findByRole("dialog", { name: "Robe bleue" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/products/product-a/quick-view", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(screen.getByRole("link", { name: "Voir la fiche complète" })).toHaveAttribute("href", "/products/robe-bleue");
    expect(screen.getByText("Aucune image disponible")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(useCatalog.getState().quickViewProductId).toBeNull();
    expect(eye).toHaveFocus();
  });

  it("affiche une erreur récupérable puis permet de réessayer", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 }).mockResolvedValueOnce(response());
    const user = setup();
    await user.click(screen.getByRole("button", { name: /Aperçu rapide de/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Produit introuvable");
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByRole("dialog", { name: "Robe bleue" })).toBeInTheDocument();
  });

  it("annule une requête et ignore une ancienne réponse après changement de produit", async () => {
    let resolveFirst!: (value: ReturnType<typeof response>) => void;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(response({ ...product, id: "product-b", name: "Autre produit" }));
    const user = setup();
    await user.click(screen.getByRole("button", { name: /Aperçu rapide de/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Chargement");
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    act(() => useCatalog.getState().setQuickViewProduct("product-b"));
    expect(await screen.findByRole("dialog", { name: "Autre produit" })).toBeInTheDocument();
    expect(signal.aborted).toBe(true);
    await act(async () => resolveFirst(response()));
    expect(screen.getByRole("dialog", { name: "Autre produit" })).toBeInTheDocument();
  });
});

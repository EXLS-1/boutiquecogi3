/**
 * =============================================================================
 * PRODUCT SEARCH PARAMS (nuqs) - Boutiquecogi3
 * =============================================================================
 * Définitions type-safe des paramètres URL pour le catalog.
 * Partagées entre client et serveur.
 */

import {
  parseAsString,
  parseAsInteger,
  parseAsStringLiteral,
  createSearchParamsCache,
  createSerializer,
} from "nuqs/server";
import { SORT_OPTIONS } from "./product-types";

const sortValues = SORT_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const productSearchParams = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  category: parseAsString.withDefault("all"),
  sort: parseAsStringLiteral(sortValues).withDefault("newest"),
  minPrice: parseAsInteger.withDefault(0),
  maxPrice: parseAsInteger.withDefault(999999999),
};

export const searchParamsCache = createSearchParamsCache(productSearchParams);
export const serializeProductParams = createSerializer(productSearchParams);
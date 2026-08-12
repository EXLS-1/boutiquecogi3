// prisma/seed/scenarios/index.ts
// ============================================
// REGISTRE SCÉNARIOS — SUR DEMANDE (CLI FLAG)
// ============================================
// Jeux de données orientés cas d'usage. Exécutés à la demande, pas
// par défaut. Se déclenchent via l'orchestrateur lorsqu'un flag
// --scenario=<name> est passé.

import { SeedRegistry } from "../types";
import { HighVolumeOrdersScenario } from "./high-volume-orders";
import { InventoryConflictScenario } from "./inventory-conflict";
import { RbacMatrixTestScenario } from "./rbac-matrix-test";
import { DualCurrencyCheckoutScenario } from "./dual-currency-checkout";

export const scenariosRegistry: SeedRegistry = [
  HighVolumeOrdersScenario,
  InventoryConflictScenario,
  RbacMatrixTestScenario,
  DualCurrencyCheckoutScenario,
];
# TRS Phase 5C + 5D

This package adds a functional procurement-return and stock-movement layer on top of the existing TRS purchasing and inventory modules.

## Included
- Purchase returns with approval and automatic stock reversal
- Inter-warehouse stock transfers
- Physical/cycle/spot stock counts with variance posting
- Wastage, spoilage, expiry, damage, production-loss and theft entries
- Inventory movement ledger references for transfer, stock count and wastage
- Permission-protected App Router APIs
- Realtime dashboard refresh hooks
- Consolidated admin operations page

## Important
The current InventoryItem model stores global stock, not per-warehouse balances. Transfers therefore create paired ledger movements and preserve global stock. Per-warehouse on-hand balances require the later warehouse-balance module.

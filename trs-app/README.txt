TRS ADMIN CLEAN REPLACEMENT

EASIEST METHOD
1. Extract this ZIP.
2. Copy the extracted "payload" folder and "APPLY_ADMIN_FIX.bat" into your TRS project root (beside package.json).
3. Double-click APPLY_ADMIN_FIX.bat.
4. Run: npm run check

WHAT IT DOES
- Deletes the complete conflicting app/admin folder.
- Installs one clean admin route tree.
- Keeps /admin/login public.
- Keeps /admin/dashboard inside the protected route group.
- Installs the required admin components, navigation, and login API.

FINAL ROUTES
/admin/login
/admin/forgot-password
/admin/reset-password
/admin/dashboard

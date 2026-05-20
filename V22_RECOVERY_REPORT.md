# V22 Recovery Report

This archive restores post-v16 UI/admin changes and keeps v20/v21 backend admin updates.

Included fixes:
- restored black page background and white page shell;
- restored white/mint bordered cards, deep shadows, header buttons, Max/Telegram buttons;
- restored Important Events two-panel layout, event images, mint semi-transparent arrows, 10s rotation and visible dots;
- restored current-month important-date strip with red active date outline;
- restored enlarged calendar + event description in one common shell, hover tooltip above date, red selected date outline, visible dots;
- restored empty calendar state image and sticker below mode buttons;
- restored filters: Kassy, SNO, Max source, Week label, city search, removed Online city and Telegram topic;
- retained admin settings diagnostics with ab_partner_admin_token;
- retained admin user create/edit/delete/password reset;
- retained rich text editor for event description;
- retained Event.sourcePostId/Event.deletedAt soft delete, restore, duplicate-import protection.

After copying this archive into the repository, run:

```bash
npm exec -- prisma generate --schema=apps/backend/prisma/schema.prisma
npm run lint -w apps/backend
npm run build -w apps/backend
npm run lint -w apps/frontend
npm run build -w apps/frontend
```

# Gmb Design System Direction

## Brand relationship

Gmb is a GrowClinic product. It should feel like part of the same ecosystem while giving authenticated operations work a quieter, more precise interface.

## Surface rules

| Surface | Typography | Palette | Character |
| --- | --- | --- | --- |
| Public marketing and clinic dashboard | Archivo headings, IBM Plex Sans body | White, near-black ink, GrowClinic blue, subtle green success | Confident, clinical, growth-focused |
| OTP, onboarding, audit, and Super Admin | Inter | `#050507` canvas, white text, white 4–14% overlays, blue actions | Private, focused, high-trust operations |

## Tokens

```css
--gc-blue: #3B82F6;
--gc-ink: #171717;
--gc-paper: #FFFFFF;
--gc-admin-canvas: #050507;
--gc-admin-text: rgba(255, 255, 255, 0.96);
--gc-admin-muted: rgba(255, 255, 255, 0.64);
--gc-admin-surface: rgba(255, 255, 255, 0.04);
--gc-admin-border: rgba(255, 255, 255, 0.10);
--gc-success: #10B981;
--gc-warning: #FBBC04;
--gc-danger: #EF4444;
```

Use 8px, 11px, 14px, and 15px radii deliberately: 8px for controls, 11–14px for inputs/overlays, and 15px for cards. Do not introduce unrelated gradients or new accent colors for customer-facing workflows.

## UX rules

- Authenticated surfaces never use the public marketing header or footer.
- Every action has one of: Draft, Awaiting approval, Scheduled, Publishing, Published, Failed, or Needs attention.
- Health Score must always show evidence, confidence, deduction, and next action.
- Protected-field changes must show current value, proposed value, Google impact note, and explicit confirmation.
- Sensitive review actions are visually distinct and never share the normal quick-reply path.
- Mobile is first-class: no critical task should need a horizontal table scroll.
- Use progressive disclosure: overview first, evidence and settings on demand.

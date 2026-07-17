---
name: Serene Network
colors:
  surface: '#f8f9fa'
  surface-dim: '#d8dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f5'
  surface-container: '#eceeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#414845'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#eff1f2'
  outline: '#717975'
  outline-variant: '#c0c8c4'
  surface-tint: '#3d6659'
  primary: '#366053'
  on-primary: '#ffffff'
  primary-container: '#4f796b'
  on-primary-container: '#d7ffef'
  inverse-primary: '#a3d0bf'
  secondary: '#3d6282'
  on-secondary: '#ffffff'
  secondary-container: '#b4d8fd'
  on-secondary-container: '#3a5f7f'
  tertiary: '#5b5852'
  on-tertiary: '#ffffff'
  tertiary-container: '#74716a'
  on-tertiary-container: '#fbf6ed'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bfecdb'
  primary-fixed-dim: '#a3d0bf'
  on-primary-fixed: '#002018'
  on-primary-fixed-variant: '#244e42'
  secondary-fixed: '#cde5ff'
  secondary-fixed-dim: '#a6caef'
  on-secondary-fixed: '#001d32'
  on-secondary-fixed-variant: '#244a69'
  tertiary-fixed: '#e7e2d9'
  tertiary-fixed-dim: '#cac6be'
  on-tertiary-fixed: '#1d1c16'
  on-tertiary-fixed-variant: '#494740'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding-mobile: 20px
  container-padding-desktop: 48px
  gutter: 24px
  section-gap: 64px
---

## Brand & Style
The design system focuses on a "Medical Fixer" concept, moving away from sterile, intimidating clinical aesthetics toward a "Care-First" philosophy. The brand personality is professional yet deeply empathetic, aiming to evoke a sense of relief and organized support.

The design style is **Corporate Modern with a Soft Humanist touch**. It utilizes high-quality whitespace and balanced compositions to reduce cognitive load for users who may be in stressful medical situations. To reinforce the "connected" nature of the service, the UI employs subtle overlapping background elements and organic, interconnected line patterns that symbolize a supportive network of care.

## Colors
The palette is designed to be soothing and trustworthy.
- **Primary (Sage Green):** Used for main actions and brand identity. It represents health and calm.
- **Secondary (Soft Blue):** Used for supportive information and accents, evoking a sense of stability.
- **Tertiary (Warm Neutral):** Acts as the primary background color for large surfaces to avoid the harshness of pure white.
- **Success/Warning/Error:** Maintain a muted tone to ensure they don't trigger anxiety. Use a soft emerald for success and a dusty coral for errors.

## Typography
Inter is chosen for its exceptional readability and neutral, professional character. 
- **Headlines:** Use Medium to Semi-Bold weights with slight negative letter-spacing to create a confident, grounded appearance.
- **Body:** Standardize on 16px for primary reading to ensure accessibility for all age groups.
- **Visual Hierarchy:** Use color (Primary Sage) for key headlines to soften the interface, while keeping body text in a dark charcoal for maximum contrast.

## Layout & Spacing
The layout follows a **Fluid Grid** model with generous margins to promote a sense of "airiness."
- **Desktop:** 12-column grid with a max-width of 1280px.
- **Mobile:** Single column with 20px side margins.
- **Rhythm:** Use an 8px base unit. Components should prioritize vertical breathing room (e.g., 16px internal padding for buttons, 24px for cards) to prevent the UI from feeling "cluttered" or "urgent."

## Elevation & Depth
Depth is created through **Tonal Layers** and **Ambient Shadows**. 
- Surfaces should use subtle tinting (e.g., a card slightly lighter than the background).
- Shadows must be extremely soft: use high blur (16-24px) and low opacity (4-8%) with a slight Sage or Blue tint to the shadow color rather than pure black. This prevents "floating" elements from feeling heavy or aggressive.
- Backdrop blurs (10px) are used for modals to maintain the user's context without visual noise.

## Shapes
The shape language is consistently **Rounded** (8px default). This removes sharp edges that contribute to clinical anxiety. 
- Large containers (Cards) use 16px (rounded-lg).
- Overlapping elements should use organic, "squircle" shapes to appear more natural and less mechanical.
- Interconnecting lines should have rounded caps and joins to maintain the friendly aesthetic.

## Components
- **Buttons:** Primary buttons use the Sage Green with white text and a subtle 4px vertical offset shadow. Secondary buttons use an outline style with a 2px stroke in Soft Blue.
- **Cards:** Cards are the primary vessel for information. They should feature a 1px border in a very pale Sage and no harsh shadows unless hovered.
- **Chips:** Used for medical tags or categories; these should be pill-shaped with a low-opacity background fill of the category color.
- **Inputs:** Form fields should have a soft background fill (`#F9FAF9`) rather than a white background to reduce screen glare, with a 2px Sage border appearing only on focus.
- **Progress Indicators:** Use soft, rounded bars with a gradient transition from Blue to Sage to symbolize progress toward "healing" or "resolution."
- **Connected Patterns:** A decorative component of "Network Lines" (thin, 1px curved paths) should be used in the background of headers or transition areas to reinforce the "Fixer" connectivity.
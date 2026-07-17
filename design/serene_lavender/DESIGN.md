---
name: Serene Lavender
colors:
  surface: '#f9f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f9f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f5'
  surface-container: '#edeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e4'
  on-surface: '#1a1c1d'
  on-surface-variant: '#47464f'
  inverse-surface: '#2f3132'
  inverse-on-surface: '#f0f0f2'
  outline: '#787680'
  outline-variant: '#c8c5d0'
  surface-tint: '#5d588c'
  primary: '#5a5689'
  on-primary: '#ffffff'
  primary-container: '#736fa4'
  on-primary-container: '#fffbff'
  inverse-primary: '#c6c0fb'
  secondary: '#5e5a7d'
  on-secondary: '#ffffff'
  secondary-container: '#dbd5fe'
  on-secondary-container: '#5f5b7d'
  tertiary: '#5b5b67'
  on-tertiary: '#ffffff'
  tertiary-container: '#747380'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c6c0fb'
  on-primary-fixed: '#191444'
  on-primary-fixed-variant: '#454173'
  secondary-fixed: '#e4dfff'
  secondary-fixed-dim: '#c8c2e9'
  on-secondary-fixed: '#1b1836'
  on-secondary-fixed-variant: '#474364'
  tertiary-fixed: '#e3e1f0'
  tertiary-fixed-dim: '#c6c5d3'
  on-tertiary-fixed: '#1a1b25'
  on-tertiary-fixed-variant: '#464652'
  background: '#f9f9fb'
  on-background: '#1a1c1d'
  surface-variant: '#e2e2e4'
typography:
  display-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-md:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

This design system is built for high-end wellness, meditation, or boutique lifestyle applications where tranquility and professional reliability intersect. The brand personality is serene, sophisticated, and deeply intentional, prioritizing the user's mental space through visual quietude.

The design style is **Modern Minimalist with Soft Tonal Layering**. It moves away from the starkness of pure white-space minimalism toward a warmer, more welcoming "soft-ui" approach. By utilizing a calming lavender foundation, the interface evokes a sense of renewal and clarity, ensuring the user feels supported rather than overwhelmed.

## Colors

The palette is centered around a primary **Soft Lavender (#8B86BD)**, chosen for its psychological association with calmness and focus. This is supported by a deeper secondary slate-lavender for structural elements and text, ensuring high legibility and professional weight.

We utilize a "Container" system for tonal depth:
- **Primary Container**: A very pale, desaturated lavender used for large background sections or card fills to provide a soft landing for the eye.
- **On-Primary-Container**: A deep, high-contrast purple-grey used for icons and text inside pale containers to maintain WCAG accessibility.
- **Surface**: Nearly white with a hint of coolness to prevent eye strain.

## Typography

This design system utilizes **Manrope** for all roles to achieve a modern, balanced, and highly legible look. Its geometric foundations provide a sense of stability, while its subtle rounded terminals mirror the softness of the brand color palette.

- **Headlines**: Use Semi-Bold (600) or Bold (700) weights with tight letter spacing to command attention without feeling aggressive.
- **Body Text**: Use a generous 1.6x line height for `body-lg` to ensure long-form content is readable and airy.
- **Labels**: Small labels use Medium (500) weight and increased letter-spacing for clarity in navigation and micro-copy.

## Layout & Spacing

The layout is governed by an **8px base grid** to ensure mathematical harmony across all components. 

- **Desktop**: A 12-column fluid grid with 64px side margins. Content is often centered in a max-width container of 1200px to maintain focus.
- **Mobile**: A 4-column grid with 16px margins. 
- **Spacing Philosophy**: Favor generous white space (using the `xl` spacing token) between major sections to prevent visual clutter. Use "Inset" padding for cards that scales from 16px (mobile) to 24px (desktop).

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layers** and **Ambient Shadows**. 

Instead of heavy black shadows, this design system uses "Lavender Tints" in the shadows (e.g., `rgba(139, 134, 189, 0.1)`) to maintain the soft aesthetic. 
- **Level 0 (Base)**: Surface color.
- **Level 1 (Cards/Lists)**: A subtle 1px outline in `outline` color or a very soft, spread-out shadow (12px blur, 4px Y-offset).
- **Level 2 (Modals/Popovers)**: Higher elevation with a more pronounced ambient shadow and a backdrop blur of 8px to focus the user's attention.

## Shapes

The shape language is consistently **Rounded**, reinforcing the welcoming and organic nature of the brand.

- **Standard Elements**: 0.5rem (8px) for buttons, input fields, and small cards.
- **Large Containers**: 1rem (16px) for main content cards and modal overlays.
- **Interactive Indicators**: Use 1.5rem (24px) for chips and selection pills to provide a distinct "tactile" contrast to the more structural rectangular elements.

## Components

### Buttons
Primary buttons use the `primary` lavender fill with `on-primary` white text. Secondary buttons use the `primary-container` fill with `on-primary-container` text for a subtle, lower-priority look. All buttons have a minimum height of 44px for accessibility.

### Input Fields
Inputs use a `surface` fill with a 1px `outline`. On focus, the border transitions to `primary` with a 2px stroke and a soft lavender outer glow. Labels sit above the field in `label-sm`.

### Cards
Cards are the primary container for content. They should use a `surface` fill, `rounded-lg` corners, and the Level 1 elevation shadow. For grouped content, cards can be placed inside a `primary-container` background for a "nested" effect.

### Chips & Selection
Chips should be pill-shaped. Selected states use the `primary` color, while unselected states use a light `outline` with no fill to maintain a "ghost" appearance.

### Progress & Loading
Loading states and progress bars use a soft pulse animation between `primary-container` and `primary`.
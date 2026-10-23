/**
 * PostCSS config — Tailwind v4 (per S2.2 init).
 *
 * Tailwind v4 用 CSS-based config (@theme in globals.css)；
 * 这里只需声明 PostCSS plugin。
 *
 * Refs:
 * - https://tailwindcss.com/docs/installation/using-postcss
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

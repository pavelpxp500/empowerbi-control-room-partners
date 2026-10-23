/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: 'var(--ground)', surface: 'var(--surface)', surface2: 'var(--surface-2)',
        surface3: 'var(--surface-3)', ink: 'var(--ink)', ink2: 'var(--ink-2)', ink3: 'var(--ink-3)',
        line: 'var(--line)', line2: 'var(--line-2)', accent: 'var(--accent)',
        accentSoft: 'var(--accent-soft)', accent2: 'var(--accent-2)', bar: 'var(--bar)', barWarn: 'var(--bar-warn)', barBad: 'var(--bar-bad)', good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)',
        c1: 'var(--c1)', c2: 'var(--c2)', c3: 'var(--c3)', c4: 'var(--c4)',
        navy: 'var(--navy)', navySoft: 'var(--navy-soft)', petrol: 'var(--petrol)',
      },
      fontFamily: {
        ui: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Open Sans Variable', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Open Sans Variable', 'Helvetica', 'Arial', 'sans-serif'],
        brand: ['Oswald Variable', 'Oswald', 'Arial Narrow', 'Arial', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Open Sans Variable', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          primary: 'var(--brand-primary)',
          'primary-hover': 'var(--brand-primary-hover)',
          'primary-bg': 'var(--brand-primary-bg)',
        },
        fcgreen: {
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        action: {
          primary: 'var(--action-primary)',
          'primary-hover': 'var(--action-primary-hover)',
          secondary: 'var(--action-secondary)',
          'secondary-hover': 'var(--action-secondary-hover)',
          ghost: 'var(--action-ghost)',
          'ghost-hover': 'var(--action-ghost-hover)',
          disabled: 'var(--action-disabled)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          default: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          focus: 'var(--border-focus)',
        },
        divider: {
          DEFAULT: 'var(--divider-default)',
          default: 'var(--divider-default)',
          subtle: 'var(--divider-subtle)',
        },
        feedback: {
          success: 'var(--color-success)',
          'success-bg': 'var(--color-success-bg)',
          'success-border': 'var(--color-success-border)',
          warning: 'var(--color-warning)',
          'warning-bg': 'var(--color-warning-bg)',
          'warning-border': 'var(--color-warning-border)',
          error: 'var(--color-error)',
          'error-bg': 'var(--color-error-bg)',
          'error-border': 'var(--color-error-border)',
        },
        'red-team': {
          DEFAULT: 'var(--color-red-team)',
          bg: 'var(--color-red-team-bg)',
          border: 'var(--color-red-team-border)',
        },
        'blue-team': {
          DEFAULT: 'var(--color-blue-team)',
          bg: 'var(--color-blue-team-bg)',
          border: 'var(--color-blue-team-border)',
        },
        // 축구 게임 메타포
        condition: {
          best: 'var(--condition-best)',
          good: 'var(--condition-good)',
          normal: 'var(--condition-normal)',
          poor: 'var(--condition-poor)',
          worst: 'var(--condition-worst)',
        },
        tier: {
          bronze: 'var(--tier-bronze)',
          'bronze-bg': 'var(--tier-bronze-bg)',
          silver: 'var(--tier-silver)',
          'silver-bg': 'var(--tier-silver-bg)',
          gold: 'var(--tier-gold)',
          'gold-bg': 'var(--tier-gold-bg)',
          special: 'var(--tier-special)',
          'special-bg': 'var(--tier-special-bg)',
        },
        stat: {
          diamond: 'var(--stat-diamond)',
          gold: 'var(--stat-gold)',
          silver: 'var(--stat-silver)',
          bronze: 'var(--stat-bronze)',
        },
        pos: {
          fw: 'var(--pos-fw)',
          mf: 'var(--pos-mf)',
          df: 'var(--pos-df)',
          gk: 'var(--pos-gk)',
        },
        chem: {
          strong: 'var(--chem-strong)',
          weak: 'var(--chem-weak)',
          neutral: 'var(--chem-neutral)',
        },
        stamina: {
          full: 'var(--stamina-full)',
          mid: 'var(--stamina-mid)',
          low: 'var(--stamina-low)',
        },
        foot: {
          active: 'var(--foot-active)',
          inactive: 'var(--foot-inactive)',
          stroke: 'var(--foot-stroke)',
        },
        viz: {
          primary: 'var(--viz-primary)',
          'primary-fill': 'var(--viz-primary-fill)',
          secondary: 'var(--viz-secondary)',
          'secondary-fill': 'var(--viz-secondary-fill)',
          tertiary: 'var(--viz-tertiary)',
          'tertiary-fill': 'var(--viz-tertiary-fill)',
          danger: 'var(--viz-danger)',
          'danger-fill': 'var(--viz-danger-fill)',
          grid: 'var(--viz-grid)',
          label: 'var(--viz-label)',
        },
        // 축구 소셜앱 메타포
        attend: {
          yes: 'var(--attend-yes)',
          maybe: 'var(--attend-maybe)',
          no: 'var(--attend-no)',
        },
        result: {
          win: 'var(--result-win)',
          draw: 'var(--result-draw)',
          loss: 'var(--result-loss)',
        },
        matchst: {
          upcoming: 'var(--match-upcoming)',
          live: 'var(--match-live)',
          completed: 'var(--match-completed)',
          cancelled: 'var(--match-cancelled)',
        },
        award: {
          mvp: 'var(--award-mvp)',
          motm: 'var(--award-motm)',
          assist: 'var(--award-assist)',
          goals: 'var(--award-goals)',
        },
        fee: {
          paid: 'var(--fee-paid)',
          unpaid: 'var(--fee-unpaid)',
          partial: 'var(--fee-partial)',
        },
        skill: {
          beginner: 'var(--skill-beginner)',
          intermediate: 'var(--skill-intermediate)',
          advanced: 'var(--skill-advanced)',
          pro: 'var(--skill-pro)',
        },
        trend: {
          up: 'var(--trend-up)',
          down: 'var(--trend-down)',
          flat: 'var(--trend-flat)',
        },
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        shimmer: 'shimmer 2s infinite',
        slideUp: 'slideUp 0.3s ease-out',
        slideInRight: 'slideInRight 0.25s ease-out',
      }
    },
  },
  plugins: [],
};
export default config;

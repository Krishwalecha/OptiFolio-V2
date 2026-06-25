
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			strokeDasharray: {
				'1000': '1000',
			},
			strokeDashoffset: {
				'1000': '1000',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				pastel: {
					'teal': '#76CDCD',
					'light-teal': '#A5E1E1',
					'dark-teal': '#3E8A8A',
					'gray': '#C8C6C6',
					'light-gray': '#E2E0E0',
					'dark-gray': '#5F5D5D',
					'blue': '#6F9CEB',
					'light-blue': '#A3BFED',
					'dark-blue': '#3A5F9F',
					'peach': '#FFCFBE',
					'sand': '#F7E3D4'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0'
					},
					'100%': {
						opacity: '1'
					}
				},
				'slide-up': {
					'0%': {
						transform: 'translateY(10px)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateY(0)',
						opacity: '1'
					}
				},
				'glow': {
					'0%': {
						'box-shadow': '0 0 5px rgba(118, 205, 205, 0.3)'
					},
					'50%': {
						'box-shadow': '0 0 20px rgba(118, 205, 205, 0.6)'
					},
					'100%': {
						'box-shadow': '0 0 5px rgba(118, 205, 205, 0.3)'
					}
				},
				'flow': {
					'0%': {
						'stroke-dashoffset': '1000',
						'opacity': '0'
					},
					'30%': {
						'opacity': '0.6'
					},
					'100%': {
						'stroke-dashoffset': '0',
						'opacity': '1'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'slide-up': 'slide-up 0.4s ease-out',
				'glow-slow': 'glow 3s infinite',
				'flow': 'flow 2s ease-out forwards'
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		function({ addUtilities }) {
			const newUtilities = {
				'.stroke-dasharray-1000': {
					'stroke-dasharray': '1000'
				},
				'.stroke-dashoffset-1000': {
					'stroke-dashoffset': '1000'
				},
			}
			addUtilities(newUtilities)
		}
	],
} satisfies Config;

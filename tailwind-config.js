/**
 * LifeSync - Tailwind Configuration
 * Palet warna LifeSync
 */
tailwind.config = {
    theme: {
        extend: {
            colors: {
                // Primary Green
                primary: {
                    DEFAULT: '#16A34A',
                    50:  '#F0FDF4',
                    100: '#DCFCE7',
                    200: '#BBF7D0',
                    300: '#86EFAC',
                    400: '#4ADE80',
                    500: '#16A34A',
                    600: '#15803D',
                    700: '#166534',
                    800: '#14532D',
                    900: '#052E16'
                },
                // brand aliases primary for template compatibility
                brand: {
                    DEFAULT: '#16A34A',
                    50:  '#F0FDF4',
                    100: '#DCFCE7',
                    200: '#BBF7D0',
                    300: '#86EFAC',
                    400: '#4ADE80',
                    500: '#16A34A',
                    600: '#15803D',
                    700: '#166534',
                    800: '#14532D',
                    900: '#052E16'
                },
                // Lime accent
                secondary: {
                    DEFAULT: '#84CC16',
                    50:  '#F7FEE7',
                    100: '#ECFCCB',
                    200: '#D9F99D',
                    300: '#BEF264',
                    400: '#A3E635',
                    500: '#84CC16',
                    600: '#65A30D',
                    700: '#4D7C0F',
                    800: '#3F6212',
                    900: '#365314'
                },
                // Sky blue for information and assistance
                tertiary: {
                    DEFAULT: '#0EA5E9',
                    50:  '#F0F9FF',
                    100: '#E0F2FE',
                    200: '#BAE6FD',
                    300: '#7DD3FC',
                    400: '#38BDF8',
                    500: '#0EA5E9',
                    600: '#0284C7',
                    700: '#0369A1',
                    800: '#075985',
                    900: '#0C4A6E'
                },
                // Accent aliases
                accent: {
                    DEFAULT: '#84CC16',
                    orange:  '#84CC16',
                    coral:   '#84CC16',
                    teal:    '#0EA5E9',
                    tertiary:'#0EA5E9',
                    purple:  '#0EA5E9',
                    blue:    '#0EA5E9',
                    emerald: '#16A34A'
                },
                // Neutral shades
                neutral: {
                    900: '#24352B',
                    800: '#33483A',
                    700: '#465B4D',
                    600: '#5E7165',
                    500: '#788A7D',
                    400: '#9BA99F',
                    300: '#C4CEC6',
                    200: '#DEE6DF',
                    100: '#EDF3ED',
                    50:  '#F7FAF7'
                },
                // Text colors
                ink: {
                    DEFAULT: '#24352B',
                    soft:    '#5E7165',
                    muted:   '#9BA99F'
                }
            },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
            },
            boxShadow: {
                glow:         '0 18px 45px -18px rgba(22, 163, 74, 0.45)',
                'glow-lg':    '0 28px 70px -22px rgba(22, 163, 74, 0.55)',
                card:         '0 22px 60px -30px rgba(36, 53, 43, 0.25)',
                soft:         '0 4px 20px -4px rgba(36, 53, 43, 0.05), 0 2px 6px -2px rgba(36, 53, 43, 0.03)',
                'soft-hover': '0 10px 25px -5px rgba(22, 163, 74, 0.12), 0 4px 10px -2px rgba(22, 163, 74, 0.06)'
            },
            borderRadius: {
                '4xl': '2rem',
                '5xl': '2.5rem'
            }
        }
    }
};

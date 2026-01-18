/**
 * 颜色工具函数
 * 用于生成自定义主题色板
 */

/**
 * 将 Hex 颜色转换为 RGB 对象
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1]!, 16),
            g: parseInt(result[2]!, 16),
            b: parseInt(result[3]!, 16),
        }
        : null;
}

/**
 * 将 RGB 对象转换为 Hex 颜色
 */
function rgbToHex(r: number, g: number, b: number): string {
    return (
        '#' +
        ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
            .toString(16)
            .slice(1)
    );
}

/**
 * 混合两个颜色
 * @param color1 起始颜色 (Hex)
 * @param color2 混合颜色 (Hex)
 * @param weight 混合权重 (0-1)，0 为完全 color1，1 为完全 color2
 */
function mixColors(color1: string, color2: string, weight: number): string {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return color1;

    const r = rgb1.r * (1 - weight) + rgb2.r * weight;
    const g = rgb1.g * (1 - weight) + rgb2.g * weight;
    const b = rgb1.b * (1 - weight) + rgb2.b * weight;

    return rgbToHex(r, g, b);
}

/**
 * 色板类型定义
 */
export interface ColorPalette {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
}

/**
 * 根据基础颜色生成完整色板
 * @param baseColor 基础颜色 (Hex) - 对应 500
 */
export function generatePalette(baseColor: string): ColorPalette {
    const white = '#ffffff';
    const black = '#000000';

    // 50-400: 与白色混合
    // 500: 基础色
    // 600-900: 与黑色混合

    return {
        50: mixColors(baseColor, white, 0.95),
        100: mixColors(baseColor, white, 0.9),
        200: mixColors(baseColor, white, 0.75),
        300: mixColors(baseColor, white, 0.6),
        400: mixColors(baseColor, white, 0.3),
        500: baseColor,
        600: mixColors(baseColor, black, 0.1),
        700: mixColors(baseColor, black, 0.25),
        800: mixColors(baseColor, black, 0.4),
        900: mixColors(baseColor, black, 0.6),
    };
}

/**
 * 生成深色模式下的反转色板 (可选)
 * 深色模式下，50 通常是最深色，900 是最亮色(背景) 或 相反
 * 这里我们生成一个适合深色背景的色板
 * 通常 Tailwind 的 dark:bg-mint-900 是深色背景
 */
export function generateDarkPalette(baseColor: string): ColorPalette {
    // 简单的反转映射，或者重新生成
    // 在深色模式下，我们希望 primary-50 是深色(背景)，primary-900 是浅色(高亮)
    // 但 Tailwind 的默认逻辑是 50 浅 -> 900 深
    // 如果我们想保持变量名一致性 (e.g. bg-primary-50 在深色下变黑)，我们需要在这里做反转

    // 方案: 
    // Light Mode: 50(Light) -> 900(Dark)
    // Dark Mode: 50(Dark) -> 900(Light)

    const palette = generatePalette(baseColor);

    return {
        50: palette[900],
        100: palette[800],
        200: palette[700],
        300: palette[600],
        400: palette[500], // 500 保持不变或微调
        500: palette[400],
        600: palette[300],
        700: palette[200],
        800: palette[100],
        900: palette[50], // 900 变为最亮
    };
}

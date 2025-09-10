// v0.1.1 - Disable Community Plugins from Sidebar (JS)
'use strict';


/**
 * Imports core classes from the Obsidian API.
 * @typedef {import('obsidian').Plugin} Plugin - Base class for all Obsidian plugins.
 * @typedef {import('obsidian').Notice} Notice - Class for displaying notifications in Obsidian.
 * @typedef {import('obsidian').FuzzySuggestModal} FuzzySuggestModal - Modal for fuzzy search suggestions.
 */
const { Plugin, Notice, FuzzySuggestModal } = require('obsidian');

/**
 * @typedef {Object} RGB
 * @property {number} r - Red channel (0–255)
 * @property {number} g - Green channel (0–255)
 * @property {number} b - Blue channel (0–255)
 * @property {number} [a=1] - Alpha (0–1)
 */

/**
 * @typedef {Object} HSL
 * @property {number} h - Hue in degrees (0–360)
 * @property {number} s - Saturation in percent (0–100)
 * @property {number} l - Lightness in percent (0–100)
 * @property {number} [a=1] - Alpha (0–1)
 */

/**
 * Minimal color utility: parse, convert, edit, and stringify colors.
 * Supports `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb[a]()`, and `hsl[a]()`.
 * This class provides a simple and efficient way to work with colors in various formats, allowing for easy parsing, conversion, editing, and stringification of color values.
 * It is designed to handle common color representations used in web development, making it a useful tool for developers who need to manipulate colors in their applications.
 * The Color class supports a range of color formats, including hexadecimal strings, RGB and RGBA strings, and HSL and HSLA strings, providing flexibility in how colors can be represented and manipulated.
 * It is important to note that this class does not include advanced color manipulation features or support for color spaces beyond RGB and HSL, focusing instead on providing a straightforward and accessible interface for basic color operations.
 * This class is particularly useful for developers who need to work with colors in a web context, as it provides a convenient way to handle color values in a variety of formats commonly used in CSS and other web technologies.
 * Overall, the Color class serves as a lightweight and easy-to-use utility for managing colors in JavaScript applications, making it a valuable addition to any developer's toolkit.
 * @public
 * @class Color
 * @example
 * const c1 = Color.parse('#09c');                    // → Color
 * const c2 = Color.parse('hsl(200 100% 50% / .6)');  // → Color
 * const c3 = Color.parse({ r: 10, g: 20, b: 30 });   // → Color
 * const c4 = Color.parse({ h: 200, s: 100, l: 50 }); // → Color
 * const c5 = Color.parse('rgba(10, 20, 30, 0.5)');   // → Color
 * const c6 = Color.parse('rgb(10% 20% 30%)');        // → Color
 * const c7 = Color.parse('hsl(200deg 100% 50%)');     // → Color
 * const c8 = Color.parse('hsla(200 100% 50% / 0.5)'); // → Color
 * const hex = c1.toHex();                             // → "#0099cc"
 * const rgbStr = c2.toRgbString();                     // → "rgb(0, 170, 255)"
 * const hslStr = c3.toHslString();                     // → "hsl(210 50% 16% / 0.8)"
 */
class Color {
	// #region __CLR_inits
	/**
	 * Construct a new Color instance from RGB(A) channels.
	 * This constructor initializes a new Color instance using the provided red, green, blue, and optional alpha channel values.
	 * The RGB values are expected to be in the range of 0 to 255, while the alpha value is expected to be in the range of 0 to 1.
	 * The constructor ensures that the channel values are clamped to their respective ranges, preventing any invalid color representations.
	 * This class is particularly useful for developers who need to work with colors in the RGB color space, as it provides a straightforward way to create and manipulate colors based on their channel values.
	 * It is important to note that this constructor does not perform any color space conversions or adjustments; it simply stores the provided channel values as they are.
	 * @public
	 * @constructor
	 * @param {number} r - Red (0-255)
	 * @param {number} g - Green (0-255)
	 * @param {number} b - Blue (0-255)
	 * @param {number} [a=1] - Alpha (0-1)
	 */
	constructor(r, g, b, a = 1) {
		this.r = Color._clamp255(r);
		this.g = Color._clamp255(g);
		this.b = Color._clamp255(b);
		this.a = Color._clamp01(a);
	}
	// #endregion __CLR_inits
	// #region __CLR_factories
	/**
	 * Parse many color formats.
	 * This static method creates a new Color instance from various input formats, including hex strings, RGB/A strings, HSL/A strings, and channel objects.
	 * It detects the format of the input and delegates to the appropriate internal method to handle the parsing and conversion to a Color instance.
	 * This method is particularly useful for developers who need to create Color instances from a variety of color representations, as it provides a single entry point for parsing and converting different formats into the internal RGB color space used by the Color class.
	 * It is important to note that this method does not perform any validation or error handling for unsupported formats, and it will throw an error if the input format is not recognized or cannot be parsed.
	 * @public
	 * @static
	 * @method parse
	 * @param {string|Color|RGB|HSL} input - A hex string, rgb()/hsl() string, an existing Color, or a channel object
	 * @returns {Color}
	 * @example
	 * Color.parse('#09c');                    // → Color
	 * Color.parse('hsl(200 100% 50% / .6)');  // → Color
	 * Color.parse({ r: 10, g: 20, b: 30 });   // → Color
	 * Color.parse({ h: 200, s: 100, l: 50 }); // → Color
	 */
	static parse(input) {
		if (input instanceof Color) return input;
		if (typeof input === 'string') {
			const s = input.trim();
			if (s.startsWith('#')) return Color._fromHex(s);
			if (/^rgba?\(/i.test(s)) return Color._fromRgbString(s);
			if (/^hsla?\(/i.test(s)) return Color._fromHslString(s);
		} else if (input && typeof input === 'object') {
			if ('r' in input && 'g' in input && 'b' in input) {
				return new Color(input.r, input.g, input.b, input.a ?? 1);
			}
			if ('h' in input && 's' in input && 'l' in input) {
				return Color.fromHsl(input.h, input.s, input.l, input.a ?? 1);
			}
		}
		throw new Error('Unsupported color format');
	}
	/**
	 * Construct from a hex string.
	 * This method creates a new Color instance based on the provided hex string, which can be in the formats of `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`.
	 * It interprets the hex string to extract the red, green, blue, and optional alpha values, converting them into their respective channel values for the Color instance.
	 * The method ensures that the resulting Color instance accurately represents the color specified by the hex string, making it a convenient utility for developers who need to work with colors in hex format.
	 * It is important to note that the hex string should be properly formatted, as the method does not perform any validation or error handling for malformed strings.
	 * This method is particularly useful for developers who need to create Color instances from hex color values, as it provides a straightforward way to convert the hex representation into the internal RGB color space used by the Color class.
	 * @public
	 * @method fromHex
	 * @param {string} hex - `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`
	 * @returns {Color}
	 */
	static fromHex(hex) {
		return Color._fromHex(hex);
	}
	/**
	 * Construct from HSL(A).
	 * This method creates a new Color instance based on the provided HSL (Hue, Saturation, Lightness) values, along with an optional alpha value for transparency.
	 * It converts the HSL values into the corresponding RGB values using the internal `_hslToRgb` method, which performs the necessary calculations to translate the color representation from HSL to RGB.
	 * The resulting RGB values are then used to instantiate a new Color object, which encapsulates the color in the RGB color space along with the specified alpha value.
	 * This method is particularly useful for developers who need to work with colors in the HSL color space, as it provides a straightforward way to create Color instances from HSL values without needing to manually perform the conversion to RGB.
	 * It is important to note that the HSL values should be provided in their respective ranges: hue as a degree value between 0 and 360, saturation and lightness as percentage values between 0 and 100, and alpha as a floating-point value between 0 and 1.
	 * The method ensures that the resulting Color instance accurately represents the intended color based on the provided HSL values, making it a convenient utility for color manipulation and representation in applications that utilize the Color class.
	 * @public
	 * @method fromHsl
	 * @param {number} h - Hue (0–360)
	 * @param {number} s - Saturation (0–100)
	 * @param {number} l - Lightness (0–100)
	 * @param {number} [a=1] - Alpha (0–1)
	 * @returns {Color}
	 */
	static fromHsl(h, s, l, a = 1) {
		const { r, g, b } = Color._hslToRgb(h, s, l);
		return new Color(r, g, b, a);
	}
	/**
	  * Evenly distribute hues across the wheel and return an `hsla(...)` string.
	  * This method generates a color in the HSLA format by evenly distributing hues across the color wheel based on the provided index and count of slots.
	  * It calculates the hue for the specified index, applying an optional hue offset, and combines it with the given saturation, lightness, and opacity values to create a complete HSLA color representation.
	  * The resulting color is returned as a string in the legacy CSS format `hsla(h, s%, l%, a)`, making it suitable for use in CSS stylesheets and other contexts where color values are required.
	  * This method is particularly useful for developers who need to generate a series of distinct colors for visualizations, charts, or other applications where color differentiation is important.
	  * It is important to note that the index can be negative, in which case it will wrap around the available slots, and the count must be a positive integer to ensure proper distribution of hues.
	  * The method also handles the formatting of saturation, lightness, and opacity values, allowing for both numeric and percentage inputs, ensuring flexibility in how these values can be specified.
	  * @public
	  * @static
	  * @method hslaHueIndexed
	  * @param {number} index                Zero-based slot index (may be negative; wraps)
	  * @param {number} count                Number of slots (<=0 treated as 1)
	  * @param {number} [hueOffset=0]        Starting hue in degrees (0–360; wraps)
	  * @param {number|string} [saturation=100]  Percent or string like "80%"
	  * @param {number|string} [lightness=50]    Percent or string like "40%"
	  * @param {number|string} [opacity=1]       0–1, or percent like "40%" (→ 0.4)
	  * @returns {string}                        Legacy CSS form: hsla(h, s%, l%, a)
	  *
	  * @example
	  * Color.hslaHueIndexed(0, 5)         // "hsla(0, 100%, 50%, 1)"
	  * Color.hslaHueIndexed(1, 5)         // "hsla(72, 100%, 50%, 1)"
	  * Color.hslaHueIndexed(2, 4, 30)     // "hsla(210, 100%, 50%, 1)"
	  * Color.hslaHueIndexed(2, 26, 0, 60, 45, 0.8) // "hsla(28, 60%, 45%, 0.8)"
	  */
	static hslaHueIndexed(index, count, hueOffset = 0, saturation = 100, lightness = 50, opacity = 1) {
		const safeCount = Math.max(1, Math.floor(Number(count) || 1));
		// Wrap index into [0, safeCount-1], even if negative
		const slot = ((Math.floor(index) % safeCount) + safeCount) % safeCount;

		const step = 360 / safeCount;
		const hue = ((Number(hueOffset) || 0) + slot * step) % 360;
		const h = Math.round((hue + 360) % 360);

		const pct = (v) => (typeof v === 'string' && v.trim().endsWith('%') ? v.trim() : `${Number(v)}%`);
		const s = pct(saturation);
		const l = pct(lightness);

		let a;
		if (typeof opacity === 'string' && opacity.trim().endsWith('%')) {
			a = Math.max(0, Math.min(1, parseFloat(opacity) / 100));
		} else {
			a = Math.max(0, Math.min(1, Number(opacity)));
		}

		return `hsla(${h}, ${s}, ${l}, ${+a})`;
	}
	// #endregion __CLR_factories
	// #region __CLR_conversions
	/**
	 * Hex string.
	 * This method returns the hex representation of the color, which is a common and widely recognized format for colors in web development.
	 * It is useful for quickly obtaining a string representation of the color that can be easily used in CSS or other contexts where color values are required.
	 * The output format is `#rrggbb` for fully opaque colors and `#rrggbbaa` for colors with transparency.
	 * The method ensures that each channel value is represented as a two-digit hexadecimal number, padding with leading zeros if necessary.
	 * This method is particularly useful for developers who need to work with hex color values, as it provides a straightforward way to convert the internal RGB representation of the color into a widely accepted string format.
	 * It is important to note that this method does not perform any color space conversions or adjustments; it simply returns the hex representation of the color as it is stored in the Color instance.
	 * @public
	 * @method toHex
	 * @param {boolean} [withAlpha=false] - Include alpha
	 * @returns {string} - e.g., `#0099cc` or `#0099cc99`
	 */
	toHex(withAlpha = false) {
		const h = (n) => n.toString(16).padStart(2, '0');
		const base = `#${h(this.r)}${h(this.g)}${h(this.b)}`;
		return withAlpha ? base + h(Math.round(Color._clamp01(this.a) * 255)) : base;
	}

	/**
	 * Raw RGB(A) channels.
	 * This method returns the RGB representation of the color as an object containing the red, green, blue, and alpha channels.
	 * It is useful for obtaining the individual channel values for further processing or manipulation, such as when performing color calculations or conversions.
	 * The returned object has the properties `r`, `g`, `b`, and `a`, where `r`, `g`, and `b` are integers in the range of 0 to 255, representing the red, green, and blue channels respectively, and `a` is a floating-point number in the range of 0 to 1, representing the alpha channel (opacity).
	 * This method is particularly useful for developers who need to work with the raw channel values of a color, as it provides a straightforward way to access these values without any additional formatting or conversion.
	 * It is important to note that this method does not perform any color space conversions or adjustments; it simply returns the raw channel values as they are stored in the Color instance.
	 * @public
	 * @method toRgb
	 * @returns {RGB}
	 */
	toRgb() {
		return { r: this.r, g: this.g, b: this.b, a: this.a };
	}

	/**
	 * CSS `rgb()` / `rgba()` string (modern space+slash syntax).
	 * CSS `rgb()` / `rgba()` string (legacy comma form for broad support).
	 * This method returns the RGB representation of the color in a string format that is compatible with modern CSS, using the space-separated syntax for the `rgb()` function.
	 * It is useful for generating color values that can be directly used in CSS stylesheets or inline styles, ensuring compatibility with the latest CSS specifications.
	 * The output format is `rgb(r g b)` for fully opaque colors and `rgb(r g b / a)` for colors with transparency.
	 * The method rounds the red, green, and blue values to the nearest integer for cleaner output, while the alpha value is formatted to three decimal places for precision.
	 * This method is particularly useful for developers who want to ensure their color values are in line with modern CSS practices, as it adheres to the latest syntax standards for color representation.
	 * It is important to note that this method does not support the legacy comma-separated syntax, which may be required for compatibility with older browsers or environments. For those cases, the `toRgbStringLegacy()` method should be used instead.
	 * @public
	 * @method toRgbStringLegacy
	 * @returns {string}
	 */
	toRgbString() {
		return this.a === 1
			? `rgb(${this.r}, ${this.g}, ${this.b})`
			: `rgba(${this.r}, ${this.g}, ${this.b}, ${+this.a.toFixed(3)})`;
	}

	/**
	 * Raw HSL(A) channels.
	 * CSS `rgb()` string (modern space+slash syntax).
	 * This method returns the RGB representation of the color in a string format that is compatible with modern CSS, using the space-separated syntax for the `rgb()` function.
	 * It is useful for generating color values that can be directly used in CSS stylesheets or inline styles, ensuring compatibility with the latest CSS specifications.
	 * The output format is `rgb(r g b)` for fully opaque colors and `rgb(r g b / a)` for colors with transparency.
	 * The method rounds the red, green, and blue values to the nearest integer for cleaner output, while the alpha value is formatted to three decimal places for precision.
	 * @public
	 * @returns {HSL}
	 */
	toHsl() {
		return Color._rgbToHsl(this.r, this.g, this.b, this.a);
	}

	/**
	 * CSS `hsl()` / `hsla()` string (legacy comma form for broad support).
	 * CSS `hsl()` string (modern space+slash syntax).
	 * This method returns the HSL representation of the color in a string format that is compatible with CSS, using the traditional comma-separated syntax for both `hsl()` and `hsla()` functions.
	 * It is useful for generating color values that can be directly used in CSS stylesheets or inline styles, ensuring compatibility with a wide range of browsers and environments.
	 * The output format is `hsl(h, s%, l%)` for fully opaque colors and `hsla(h, s%, l%, a)` for colors with transparency.
	 * The method rounds the hue, saturation, and lightness values to the nearest integer for cleaner output, while the alpha value is formatted to three decimal places for precision.
	 * @public
	 * @method toHslStringLegacy
	 * @returns {string}
	 */
	toHslString() {
		const { h, s, l, a } = this.toHsl();
		const hs = `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
		return a === 1 ? `hsl(${hs})` : `hsl(${hs} / ${+a.toFixed(3)})`;
	}

	/**
	 * Default string form (hex).
	 * This method returns the hex representation of the color, which is a common and widely recognized format for colors in web development.
	 * It is useful for quickly obtaining a string representation of the color that can be easily used in CSS or other contexts where color values are required.
	 * @public
	 * @method toString
	 * @returns {string}
	 */
	toString() {
		return this.toHex();
	}
	// #endregion __CLR_conversions
	// #region __CLR_edits
	/**
	 * New color with adjusted alpha.
	 * This method creates a new Color instance with the same RGB channels but with a modified alpha value, allowing for easy adjustments to the transparency of the color.
	 * @public
	 * @method withAlpha
	 * @param {number} a - Alpha (0–1)
	 * @returns {Color}
	 */
	withAlpha(a) {
		return new Color(this.r, this.g, this.b, a);
	}

	/**
	 * New color with adjusted RGB channels.
	 * Lighten by fraction of full lightness range.
	 * This method increases the lightness of the color by a specified fraction, effectively making the color lighter.
	 * It calculates the new lightness by adding the given amount to the current lightness, ensuring that the result remains within the valid range of 0 to 100 percent.
	 * @public
	 * @method lighten
	 * @param {number} [amount=0.1] - 0–1 (e.g., 0.15 = +15%)
	 * @returns {Color}
	 */
	lighten(amount = 0.1) {
		const { h, s, l, a } = this.toHsl();
		return Color.fromHsl(h, s, Color._clamp01(l / 100 + amount) * 100, a);
	}

	/**
	 * Darken by fraction of full lightness range.
	 * This method reduces the lightness of the color by a specified fraction, effectively making the color darker.
	 * It calculates the new lightness by subtracting the given amount from the current lightness, ensuring that the result remains within the valid range of 0 to 100 percent.
	 * @public
	 * @method darken
	 * @param {number} [amount=0.1] - 0–1 (e.g., 0.2 = −20%)
	 * @returns {Color}
	 */
	darken(amount = 0.1) {
		const { h, s, l, a } = this.toHsl();
		return Color.fromHsl(h, s, Color._clamp01(l / 100 - amount) * 100, a);
	}

	/**
	 * Saturate by fraction of full saturation range.
	 * Linear mix with another color.
	 * @public
	 * @method mix
	 * @param {string|Color|RGB|HSL} other - Color to mix with
	 * @param {number} [t=0.5] - Mix factor (0–1); 0 = this, 1 = other
	 * @returns {Color}
	 */
	mix(other, t = 0.5) {
		const o = Color.parse(other);
		const lerp = (a, b) => Math.round(a + (b - a) * t);
		return new Color(
			lerp(this.r, o.r),
			lerp(this.g, o.g),
			lerp(this.b, o.b),
			this.a + (o.a - this.a) * t
		);
	}
	// #endregion __CLR_edits
	// #region __CLR_internals
	/**
	 * Parse a hex string into a Color instance.
	 * This is a private method that interprets hex color strings, extracting the red, green, blue, and optional alpha values to create a Color instance.
	 * It supports both the short and long forms of hex color notation, including the optional alpha channel.
	 * @static
	 * @method _fromHex
	 * @private
	 * @param {string} hex
	 * @returns {Color}
	 */
	static _fromHex(hex) {
		let h = hex.replace(/^#/, '');
		if (h.length === 3) h = h.split('').map((c) => c + c).join(''); // #rgb
		if (h.length === 4) h = h.split('').map((c) => c + c).join(''); // #rgba
		if (h.length !== 6 && h.length !== 8) throw new Error('Bad hex');
		const r = parseInt(h.slice(0, 2), 16);
		const g = parseInt(h.slice(2, 4), 16);
		const b = parseInt(h.slice(4, 6), 16);
		const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
		return new Color(r, g, b, a);
	}
	/**
	 * Parse an RGB(A) string into a Color instance.
	 * This is a private method that interprets RGB and RGBA color strings, extracting the red, green, blue, and alpha values to create a Color instance.
	 * It supports both the comma-separated and space-separated formats, including the optional alpha channel.
	 * @static
	 * @method _fromRgbString
	 * @private
	 * @param {string} s - `rgb()` or `rgba()` (comma or space forms)
	 * @returns {Color}
	 */
	static _fromRgbString(s) {
		const m = s.match(/rgba?\(([^)]+)\)/i);
		if (!m) throw new Error('Bad rgb()');
		const parts = m[1].split(/[, ]+/).filter(Boolean).map((x) => x.trim());
		const [r0, g0, b0] = parts.slice(0, 3);
		const r = /%$/.test(r0) ? (parseFloat(r0) * 255) / 100 : parseFloat(r0);
		const g = /%$/.test(g0) ? (parseFloat(g0) * 255) / 100 : parseFloat(g0);
		const b = /%$/.test(b0) ? (parseFloat(b0) * 255) / 100 : parseFloat(b0);
		const a = parts[3] != null ? parseFloat(parts[3]) : 1;
		return new Color(r, g, b, a);
	}
	/**
	 * Parse an HSL(A) string into a Color instance.
	 * This is a private method that interprets HSL and HSLA color strings, extracting the hue, saturation, lightness, and alpha values to create a Color instance.
	 * It supports both the comma-separated and space-separated formats, including the optional alpha channel.
	 * @static
	 * @method _fromHslString
	 * @private
	 * @param {string} s - `hsl()` or `hsla()` (comma or space+slash forms)
	 * @returns {Color}
	 */
	static _fromHslString(s) {
		const m = s.match(/hsla?\(([^)]+)\)/i);
		if (!m) throw new Error('Bad hsl()');
		// Support both: "h s% l% / a" and "h, s%, l%, a"
		const body = m[1].replace(/\s*\/\s*/, ',');
		const [hRaw, sRaw, lRaw, aRaw] = body.split(/[, ]+/).filter(Boolean);
		const h = Color._parseHue(hRaw);
		const S = parseFloat(sRaw) || 0;
		const L = parseFloat(lRaw) || 0;
		const a = aRaw != null ? parseFloat(aRaw) : 1;
		return Color.fromHsl(h, S, L, a);
	}
	/**
	 * Parse hue value with optional units.
	 * This is a private method that interprets hue values that may include units such as degrees, turns, or radians.
	 * It converts the hue into degrees for consistent internal representation.
	 * @static
	 * @method _parseHue
	 * @private
	 * @param {string|number} v - Hue as number or with units: `deg`, `turn`, `rad`
	 * @returns {number} - Degrees
	 */
	static _parseHue(v) {
		const s = String(v).trim();
		if (/turn$/i.test(s)) return parseFloat(s) * 360;
		if (/rad$/i.test(s)) return parseFloat(s) * (180 / Math.PI);
		return parseFloat(s); // deg implied
	}
	/**
	 * Convert RGB to HSL.
	 * This is a private method that performs the conversion from RGB color space to HSL color space.
	 * @static
	 * @method _rgbToHsl
	 * @private
	 * @param {number} r - 0–255
	 * @param {number} g - 0–255
	 * @param {number} b - 0–255
	 * @param {number} [a=1] - 0–1
	 * @returns {HSL}
	 */
	static _rgbToHsl(r, g, b, a = 1) {
		r /= 255; g /= 255; b /= 255;
		const max = Math.max(r, g, b), min = Math.min(r, g, b);
		let h, s, l = (max + min) / 2;

		if (max === min) { h = s = 0; }
		else {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch (max) {
				case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
				case g: h = ((b - r) / d + 2); break;
				default: h = ((r - g) / d + 4);
			}
			h *= 60;
		}
		return { h: (h + 360) % 360, s: s * 100, l: l * 100, a };
	}
	/**
	 * Convert HSL to RGB.
	 * This is a private method that performs the conversion from HSL color space to RGB color space.
	 * It is used internally by the Color class to facilitate color manipulations and conversions.
	 * @static
	 * @method _hslToRgb
	 * @private
	 * @param {number} h - 0–360
	 * @param {number} s - 0–100
	 * @param {number} l - 0–100
	 * @returns {{r:number,g:number,b:number}}
	 */
	static _hslToRgb(h, s, l) {
		h = ((h % 360) + 360) % 360;
		s /= 100; l /= 100;

		if (s === 0) {
			const v = Math.round(l * 255);
			return { r: v, g: v, b: v };
		}

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		const hk = h / 360;

		const tc = (t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		const r = Math.round(tc(hk + 1 / 3) * 255);
		const g = Math.round(tc(hk) * 255);
		const b = Math.round(tc(hk - 1 / 3) * 255);
		return { r, g, b };
	}
	/**
	 * Clamp a number to the range 0–1.
	 * This is useful for ensuring alpha values are valid within the expected range.
	 * @static
	 * @method _clamp01
	 * @private
	 * @param {number} x
	 * @returns {number} - 0–1
	 */
	static _clamp01(x) {
		return Math.min(1, Math.max(0, Number(x)));
	}
	/**
	 * Clamp a number to the range 0–255 and round to an integer.
	 * This is useful for ensuring RGB channel values are valid integers within the expected range.
	 * @static
	 * @method _clamp255
	 * @private
	 * @param {number} x
	 * @returns {number} - 0–255 int
	 */
	static _clamp255(x) {
		return Math.min(255, Math.max(0, Math.round(Number(x))));
	}
	// #endregion __CLR_internals
}

/* -----------------------------------------
Usage examples:

const c1 = Color.parse('#09c');            // #0099cc
const c2 = Color.parse('hsl(200 100% 50%)');
const c3 = Color.parse({ r: 20, g: 40, b: 60, a: 0.8 });

c1.toHex();               // "#0099cc"
c2.toRgbString();         // "rgb(0, 170, 255)"
c3.toHslString();         // "hsl(210 50% 16% / 0.8)"

c1.lighten(0.15).toHex(); // lighten by 15%
c2.darken(0.2).toRgbString();
c1.mix('#ff0000', 0.25).toHex();

----------------------------------------- */


class DisableFromSidebar extends Plugin {
	constructor(app, manifest) {
		super(app, manifest);
		this._styleEl = null;
		this._rootObs = null;
		this._groupObs = null;
		this._raf = 0;
		this._manCache = null; // { byId: Map, byName: Map }
		this.GROUP_TITLE = 'community plugins'; // lowercased match
		this.MARKED = 'dcps-processed';
		this.BTN_CLASS = 'dcps-xbtn';
		this.BTN_ATTR = 'data-plugin-id';
	}

	async onload() {
		this._installInfoHotkey();
		this._installFinderHotkey();
		this._installNavKeys();
		// Make the helper a bound method so `this.app` works inside it
		this._getHotkeysWcas = (pid) => _getPluginHotkeysWcasLines.call(this, pid);

		this._injectStyle();
		this._rootObs = new MutationObserver(() => this._schedule(() => this._attachIfReady()));
		this._rootObs.observe(document.body, { childList: true, subtree: true });
		this._attachIfReady(); // in case settings already open
	}

	onunload() {
		if (this._raf) cancelAnimationFrame(this._raf), (this._raf = 0);
		this._rootObs?.disconnect(); this._rootObs = null;
		this._groupObs?.disconnect(); this._groupObs = null;
		this._styleEl?.remove(); this._styleEl = null;
	}

	_schedule(fn) {
		if (this._raf) return;
		this._raf = requestAnimationFrame(() => { this._raf = 0; try { fn(); } catch (_) { } });
	}

	_injectStyle() {
		if (this._styleEl && document.head.contains(this._styleEl)) return;
		// do not alter
		const css = `
			/* Disable-from-sidebar */
			.${this.BTN_CLASS}{
				display:inline-flex;
				align-items:center;
				justify-content:center;
				width:18px;
				height:18px;
				margin-right:6px;
				border-radius:4px;
				cursor:pointer;
				user-select:none;
				color: var(--text-error, #ff4d4d);
				border: 1px solid color-mix(in oklab, var(--text-error, #ff4d4d) 70%, transparent);
				font-weight: 700;
				line-height: 1;
				opacity: .85;
			}
			.${this.BTN_CLASS}:hover{
				opacity:1;
				background: color-mix(in oklab, var(--text-error, #ff4d4d) 12%, transparent);
			}
			/* Hotkey indicator */
			.dcps-hot{
				display:inline-flex;
				align-items:center;
				justify-content:center;
				width:18px;
				height:18px;
				margin-right:6px;
				border-radius:4px;
				user-select:none;
				font-size:12px;
				line-height:1;
				color: var(--text-muted); border:1px solid var(--background-modifier-border);
				opacity:.85;
				margin-bottom: -3px;
			}
			.dcps-hot.has-hotkeys{
				cursor: pointer;
				color: var(--text-success);
				border-color: color-mix(in oklab, var(--text-success, #2ecc71) 60%, transparent);
			}
			.dcps-hot:hover{
				opacity:1;
				background: var(--background-modifier-hover);
			}

			/* Group title badges */
			.vertical-tab-header-group-title{
				position:relative;
			}
			.vertical-tab-header-group-title::before{
				display:inline-block;
				content:'';
				margin-right:6px;
			}
			.vertical-tab-header-group-title[data-dcps-title="options"]::before{
				content:"⚙️";
			}
			.vertical-tab-header-group-title[data-dcps-title="core plugins"]::before{
				content:"🔌";
				filter: grayscale(1) brightness(2);
			}
			.vertical-tab-header-group-title[data-dcps-title="community plugins"]::before{
				content:"🔌";
			}
			/* Sidebar Finder Overlay */
			#dcps-finder-overlay{
				position: fixed;
				inset: 0;
				background: color-mix(in oklab, var(--background-primary) 30%, #000 70%);
				backdrop-filter: blur(2px);
				display:none;
				z-index: 9999;
			}
			#dcps-finder{
				position: absolute;
				left: 50%;
				top: 15%;
				transform: translateX(-50%);
				width: min(720px, 92vw);
				background: var(--background-primary);
				border: 1px solid var(--background-modifier-border);
				border-radius: 12px;
				box-shadow: var(--shadow-l);
				overflow: hidden;
			}
			#dcps-finder .dcps-f-head{
				display:flex;
				align-items:center;
				gap:8px;
				padding:10px 12px;
				border-bottom: 1px solid var(--background-modifier-border);
			}
			#dcps-finder .dcps-f-head input{
				width:100%;
				border:none;
				outline:none;
				background:transparent;
				font-size: 16px;
				padding: 6px;
			}
			#dcps-finder .dcps-f-list{
				max-height: 60vh;
				overflow:auto;
			}
			#dcps-finder .dcps-f-item{
				display:flex;
				align-items:center;
				gap:10px;
				padding:8px 12px;
				cursor:pointer;
			}
			#dcps-finder .dcps-f-item .ico{
				width: 1.4em;
				text-align:center;
			}
			#dcps-finder .dcps-f-item .name{
				flex:1 1 auto;
			}
			#dcps-finder .dcps-f-item .cat{
				color: var(--text-muted);
				font-size: 12px;

				margin-left: auto;
				text-align: right;
			}
			#dcps-finder .dcps-f-item:hover, #dcps-finder .dcps-f-item.active{
				background: var(--background-modifier-hover);
			}

			#dcps-finder .dcps-f-item[data-group="options"] .name::before{
				content: '⚙️';
			}
			#dcps-finder .dcps-f-item[data-group="core plugins"] .name::before{
				content: '🔌';
				filter: grayscale(1) brightness(2);
			}

			#dcps-finder .dcps-f-item[data-group="community plugins"] .name::before{
				content: '🔌';
			}

			#dcps-finder .dcps-f-item {
				display: flex;
				align-items: center;
				justify-content: space-between;
			}

			.dcps-f-item > .cat {
				margin-left: auto;
			}


			#dcps-finder .dcps-f-item .name::before{
				display:inline-block;
				margin-right:8px;
			}

			#dcps-finder .dcps-f-item[data-group="options"] .name::before{ content: "⚙️"; }

			#dcps-finder .dcps-f-item[data-group="core plugins"] .name::before{ content: "🔌"; filter: grayscale(1) brightness(2); }

			#dcps-finder .dcps-f-item[data-group="community plugins"] .name::before{ content: "🔌"; }
		`.trim();
		const el = document.createElement('style');
		el.textContent = css;
		document.head.appendChild(el);
		this._styleEl = el;
	}

	_installFinderHotkey() {
		// Use built-in FuzzySuggestModal (F1 while Settings open)
		this.registerDomEvent(window, 'keydown', (e) => {
			if (!e) return;
			const modal = document.querySelector('.modal.mod-settings');
			if (!modal) return; // only inside Settings
			if ((e.key || '') === 'F1' && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
				e.preventDefault(); e.stopPropagation();
				new SidebarFinderModal(this.app, modal).open();
			}
		});
	}
	// -------- attach into Settings → Community plugins sidebar --------
	_cleanTitleText(t) {
		try {
			const textOnly = Array.from(t.childNodes)
				.filter(n => n.nodeType === Node.TEXT_NODE)
				.map(n => n.textContent || '')
				.join(' ')
				.trim()
				.toLowerCase()
				.replace(/\s+/g, ' ');
			return textOnly;
		} catch (_) { return ((t && t.textContent) || '').trim().toLowerCase(); }
	}

	_tagHeaderTitles(modal) {
		try {
			const root = modal || document.querySelector('.modal.mod-settings');
			if (!root) return;
			const titles = root.querySelectorAll('.vertical-tab-header-group-title');
			for (const t of titles) {
				// Prefer existing stable value; otherwise compute from TEXT_NODES only
				let val = (t.getAttribute('data-dcps-title') || '').toLowerCase();
				if (!val) {
					let txt = this._cleanTitleText(t);
					// Match by prefix to tolerate trailing icons/spans
					if (txt.startsWith('options')) val = 'options';
					else if (txt.startsWith('core plugins')) val = 'core plugins';
					else if (txt.startsWith('community plugins')) val = 'community plugins';
				}
				if (val) t.setAttribute('data-dcps-title', val);
			}
			this._ensureOptionsInfo(modal);
		} catch (_) { }
	}

	_tagHeaderTitles_(modal) {
		try {
			const root = modal || document.querySelector('.modal.mod-settings');
			if (!root) return;
			const titles = root.querySelectorAll('.vertical-tab-header-group-title');
			for (const t of titles) {
				const txt = (t.textContent || '').trim().toLowerCase();
				if (txt === 'options' || txt === 'core plugins' || txt === 'community plugins') {
					t.setAttribute('data-dcps-title', txt);
				} else {
					t.removeAttribute('data-dcps-title');
				}
			}
			this._ensureOptionsInfo(modal);
		} catch (_) { }
	}

	_attachIfReady() {
		const modal = document.querySelector('.modal.mod-settings');
		if (!modal) return;

		rainbowize(".modal-container .vertical-tab-header .vertical-tab-nav-item", true, "color");
		this._tagHeaderTitles(modal);
		// Find the "Community plugins" header in the left nav
		const titles = modal.querySelectorAll('.vertical-tab-header-group-title');
		let group = null;
		for (const t of titles) {
			const txt = (t.textContent || '').trim().toLowerCase();
			if (txt === this.GROUP_TITLE) { group = t.closest('.vertical-tab-header-group'); break; }
		}
		if (!group) return;

		const itemsWrap = group.querySelector('.vertical-tab-header-group-items') || group;
		this._decorateItems(itemsWrap);
		this._tagHeaderTitles(modal);

		// Watch this group only (childList sufficient; class/attrs not needed)
		this._groupObs?.disconnect();
		this._groupObs = new MutationObserver(() => this._schedule(() => { this._decorateItems(itemsWrap); this._tagHeaderTitles(modal); this._ensureOptionsInfo(modal); }));
		this._groupObs.observe(itemsWrap, { childList: true, subtree: true });
	}


	_ensureOptionsInfo(modal) {
		try {
			const root = modal || document.querySelector('.modal.mod-settings');
			if (!root) return;
			const title = Array.from(root.querySelectorAll('.vertical-tab-header-group-title'))
				.find(t => ((t.getAttribute('data-dcps-title') || '').toLowerCase() === 'options'));
			if (!title) return;
			if (title.querySelector(':scope > .dcps-info')) return;
			const info = document.createElement('span');
			info.className = 'dcps-info';
			info.textContent = 'ℹ️';
			info.title = 'Info: Alt+F1';
			info.style.marginLeft = '6px';
			info.style.cursor = 'pointer';
			info.addEventListener('click', () => new Notice('Info (Alt+F1)', 1500));
			title.appendChild(info);
		} catch (_) { }
	}


	_installInfoHotkey() {
		this.registerDomEvent(window, 'keydown', (e) => {
			if (!e) return;
			if (!e.altKey) return;
			const key = (e.key || '').toUpperCase();
			if (key !== 'F1') return;
			const modal = document.querySelector('.modal.mod-settings');
			if (!modal) return;
			e.preventDefault(); e.stopPropagation();
			new Notice('Info (Alt+F1)', 1500);
		});
	}

	async _decorateItems(container) {
		if (!container) return;
		// Build manifest maps once
		if (!this._manCache) this._manCache = this._getManifests();

		const items = container.querySelectorAll('.vertical-tab-nav-item');
		for (const item of items) {
			if (item.classList.contains(this.MARKED)) continue;
			item.classList.add(this.MARKED);

			// Try to get ID from DOM first
			const idAttr = item.getAttribute('data-plugin-id') || item.getAttribute('data-id');
			const labelEl = item.querySelector('.nav-label, .setting-item-name') || item;
			const name = (labelEl.textContent || '').trim();
			const id = idAttr || this._nameToId(name);
			const lines = await this._getHotkeysWcas(id);
			const hottitle = 'Click to Copy\n' + lines.join('\n');
			console.debug(`[disable-sidebar] Found plugin item: name="${name}", id="${id}", hotkeys=${lines.length}`);
			if (lines && lines.length) item.title = lines.join('\n');

			// close (×) button (only if not already there)
			let btn = item.querySelector('.' + this.BTN_CLASS);
			if (!btn) {
				btn = document.createElement('span');
				btn.className = this.BTN_CLASS;
				btn.textContent = '❌'; //
				if (id) btn.setAttribute(this.BTN_ATTR, id);
				btn.title = id ? `Disable "${name}"` : `Plugin ID not found for "${name}"`;
				btn.addEventListener('click', (ev) => this._onClickDisable(ev, item, name, id));
				insertBeforeLabelText(item, btn);
			}

			// hotkey span (only if not already there)
			let hot = item.querySelector('.dcps-hot');
			if (!hot) {
				hot = document.createElement('span');
				hot.className = 'dcps-hot' + (lines && lines.length ? ' has-hotkeys' : '');
				hot.textContent = ' ';
				if (lines && lines.length) {
					hot.title = hottitle;
					hot.addEventListener('click', async (ev) => await this._onClickCopy(ev, lines, item, name, id));
				} else {
					hot.title = `No hotkeys found for "${name}"`;
					hot.classList.remove('has-hotkeys');
					hot.removeAttribute('title');
				}
				insertBeforeLabelText(item, hot);
			}
		}
	}
	async _onClickCopy(ev, lines, item, name, id) {
		console.debug(`[disable-sidebar] Copying hotkeys for plugin: name="${name}", id="${id}", lines=${lines.length}`);
		if (!lines || !lines.length) return;
		if (!navigator.clipboard) {
			new Notice('Clipboard API not available', 2000);
			return;
		}
		if (!lines || !lines.length) {
			new Notice(`No hotkeys found for "${name}"`, 2000);
			return;
		}
		ev.preventDefault();
		ev.stopPropagation();
		if (!lines || !lines.length) {
			new Notice(`No hotkeys found for "${name}"`, 2000);
			return;
		}
		navigator.clipboard.writeText(lines.join('\n')).then(() => {
			new Notice(`Copied hotkeys for "${name}"`, 1500);
		}).catch(() => {
			new Notice('Failed to copy hotkeys', 2000);
		});
	}
	async _onClickDisable(ev, item, name, id) {
		ev.preventDefault();
		ev.stopPropagation();
		navigator.clipboard.writeText(item.title).then(() => {
			new Notice(`Copied plugin name: "${name}"`, 1500);
		}).catch(() => {
			new Notice('Failed to copy plugin name', 2000);
		});
	}
	async _onClickDisable(ev, item, name, id) {
		ev.preventDefault();
		ev.stopPropagation();
		if (!id) { new Notice(`Could not resolve plugin id for "${name}"`, 2500); return; }

		try {
			if (!this._manCache?.byId.has(id)) this._manCache = this._getManifests(); // refresh
			const isEnabled = this._isEnabled(id);
			if (!isEnabled) {
				new Notice(`"${name}" is already disabled`, 2000);
				return;
			}
			await this.app.plugins.disablePlugin(id);
			new Notice(`Disabled: ${name}`, 2000);
			this._schedule(() => this._attachIfReady());
		} catch (e) {
			console.error('[disable-sidebar] Failed to disable', id, e);
			new Notice(`Failed to disable "${name}"`, 3000);
		}
	}

	// --- Sidebar navigation hotkeys: Ctrl+PageUp / Ctrl+PageDown ---
	_installNavKeys() {
		// Only active while Settings modal is open
		this.registerDomEvent(window, 'keydown', (e) => {
			if (!e || !e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
			const key = (e.key || '').toLowerCase();
			if (key !== 'pageup' && key !== 'pagedown') return;
			// Don't hijack when typing in inputs or editors
			//if (this._isEditableTarget(e.target)) return;
			const dir = key === 'pageup' ? -1 : 1;
			if (this._moveSidebarSelection(dir)) {
				e.preventDefault(); e.stopPropagation();
			}
		});
	}

	_isEditableTarget(t) {
		if (!t) return false;
		if (t.isContentEditable) return true;
		const tag = (t.tagName || '').toUpperCase();
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
	}

	_moveSidebarSelection(dir) {
		try {
			const modal = document.querySelector('.modal.mod-settings');
			if (!modal) return false;
			const header = modal.querySelector('.vertical-tab-header');
			if (!header) return false;

			// Only nav items; skip group titles
			const items = Array.from(header.querySelectorAll('.vertical-tab-nav-item'));
			if (!items.length) return false;

			let i = items.findIndex(el => el.classList.contains('is-active'));
			if (i === -1) return false;

			const n = items.length;
			let j = i + (dir < 0 ? -1 : 1);
			// wrap
			j = (j % n + n) % n;

			const target = items[j];
			if (!target) return false;
			target.click();
			return true;
		} catch (_) {
			return false;
		}
	}

	// -------- manifests & enabled state --------
	_getManifests() {
		const src = this.app?.plugins?.manifests || {};
		const byId = new Map();
		const byName = new Map();
		for (const [id, man] of Object.entries(src)) {
			byId.set(id, man);
			const n = this._norm(man.name || '');
			if (n && !byName.has(n)) byName.set(n, id);
		}
		return { byId, byName };
	}

	_isEnabled(id) {
		const s = this.app?.plugins?.enabledPlugins;
		if (s && s.has) return s.has(id);
		const inst = this.app?.plugins?.plugins;
		return !!(inst && id in inst);
	}

	_norm(s) {
		return String(s || '')
			.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/\bplugin\b/g, '')
			.replace(/-plugin\b/g, '')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	_nameToId(name) {
		if (!this._manCache) this._manCache = this._getManifests();
		const byName = this._manCache.byName;
		const key = this._norm(name);
		return byName.get(key) || null;
	}
}

// Insert `btn` right before the visible text node in `.vertical-tab-nav-item`
function insertBeforeLabelText(item, el) {
	// 1) Try first non-empty TEXT_NODE directly under the item
	for (const n of item.childNodes) {
		if (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '') {
			item.insertBefore(el, n);
			return;
		}
	}

	// 2) If theme wraps the name, insert before that label element
	const label = item.querySelector(':scope > .nav-label, :scope > .setting-item-name');
	if (label) { item.insertBefore(el, label); return; }

	// 3) Insert before the chevron if present
	const chev = item.querySelector(':scope > .vertical-tab-nav-item-chevron');
	if (chev) { item.insertBefore(el, chev); return; }

	// 4) Fallback: beginning of the item
	item.insertAdjacentElement('afterbegin', el);
}
// Returns lines like: "enter.cs  Do the Thing"
async function _getPluginHotkeysWcasLines(pluginId) {
	console.debug(`[disable-sidebar] Gathering hotkeys for plugin ID: ${pluginId}`, this.app);
	const cmds = this.app?.commands;
	if (!cmds) return [];
	console.debug(`[disable-sidebar] Gathering hotkeys for plugin ID: ${pluginId}`);
	// Gather this plugin's commands
	const all = (cmds.listCommands?.() || Object.values(cmds.commands || {}))
		.filter(c => typeof c?.id === 'string' && c.id.startsWith(pluginId + ':'));

	const hkMgr = this.app?.hotkeyManager;
	const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '');

	const lines = [];
	for (const c of all) {
		const id = c.id;
		// Prefer resolved hotkeys from the manager (includes defaults + overrides)
		let combos = [];
		try {
			if (hkMgr?.getHotkeys) combos = hkMgr.getHotkeys(id) || [];
			else if (hkMgr?.hotkeys) combos = hkMgr.hotkeys[id] || []; // fallback (older builds)
		} catch (_) { }

		// As a last resort, read from .obsidian/hotkeys.json (custom only)
		if (!combos.length) {
			try {
				const adapter = this.app.vault.adapter;
				const cfg = this.app.vault.configDir || '.obsidian';
				const path = (window.require?.('obsidian')?.normalizePath?.(`${cfg}/hotkeys.json`)) || `${cfg}/hotkeys.json`;
				if (await adapter.exists(path)) {
					const raw = await adapter.read(path);
					const data = JSON.parse(raw);
					// data is usually { "hotkeys": [ { "command": "...", "hotkeys": [ { key, modifiers[] } ] } ] }
					const entry = (data?.hotkeys || []).find(x => x?.command === id);
					if (entry?.hotkeys?.length) combos = entry.hotkeys;
				}
			} catch (_) { }
		}

		for (const hk of combos) {
			const str = _formatHotkeyToWcas(hk, isMac);
			if (str) lines.push(`${str}\t\t${c.name || id}`);
		}
	}
	return lines;
}

// --- helpers ---

// hk: { key: string, modifiers?: string[] }  (Obsidian hotkey shape)
function _formatHotkeyToWcas(hk, isMac) {
	if (!hk) return '';
	const key = (hk.key || '').toString().trim();
	if (!key) return '';

	// Normalize modifiers array: e.g. ["Mod","Shift"] or ["Ctrl","Alt","Shift","Meta"]
	const mods = Array.isArray(hk.modifiers) ? hk.modifiers.slice() : [];

	// Expand "Mod" into platform-specific (Cmd on macOS, Ctrl elsewhere)
	const idx = mods.indexOf('Mod');
	if (idx !== -1) {
		mods.splice(idx, 1, isMac ? 'Meta' : 'Ctrl');
	}

	// Build suffix in strict W C A S order (omit missing)
	const want = ['Meta', 'Ctrl', 'Alt', 'Shift'];
	const letter = { Meta: 'w', Ctrl: 'c', Alt: 'a', Shift: 's' };
	let suffix = '';
	for (const m of want) {
		if (mods.includes(m)) suffix += letter[m];
	}

	// Key name normalized (lowercase, friendly)
	const k = key.toLowerCase();
	return suffix ? `${k}.${suffix}` : k;
}

/**
 * Rainbowize elements by first letter of text (A-Z).
 * @param {string|NodeList|Element[]} selector  CSS selector or a collection/element
 * @param {boolean} strip                      Remove non A-Z before processing (default: true)
 * @param {string} property                    CSS property to set (default: 'color')
 * @param {number|string} saturation           % or number (default: 100)
 * @param {number|string} lightness            % or number (default: 50)
 * @param {number} hueStart                    starting hue (0-360) (default: 0)
 * @param {number} hueEnd                      ending hue (0-360) (default: hueStart)
 */
function rainbowize(
	selector,
	strip = true,
	property = 'color',
	saturation = 100,
	lightness = 50,
	hueStart = 0,
	hueEnd = hueStart
) {
	const els =
		typeof selector === 'string'
			? document.querySelectorAll(selector)
			: selector instanceof Element
				? [selector]
				: selector;

	if (!els) return;

	const pct = (v) => (typeof v === 'string' ? v : `${v}%`);
	hueEnd = 359;//hueStart === hueEnd ? (hueEnd + 360) % 360 : hueEnd;
	const step = (hueEnd - hueStart) / 25; // 26 letters → 25 intervals
	const hslArr = [];
	for (let i = 0; i < 26; i++) {
		const hue = (hueStart + i * step) % 360;
		hslArr.push(`hsl(${(hue + 360) % 360}, ${pct(saturation)}, ${pct(lightness)})`);
	}
	console.debug(`[disable-sidebar] Rainbowizing elements: count=${els.length}, property="${property}", saturation="${pct(saturation)}", lightness="${pct(lightness)}", hueStart=${hueStart}, hueEnd=${hueEnd}, step=${step}`, hslArr);


	(els.forEach ? els : Array.from(els)).forEach((el) => {
		let txt = (el.textContent || '').trim();
		if (strip) txt = txt.replace(/[^A-Za-z]+/g, '');

		let ch;
		if (strip) {
			ch = txt.charAt(0);
		} else {
			const m = txt.match(/[A-Za-z]/);
			ch = m ? m[0] : '';
		}
		if (!ch) return;

		const idx = ch.toUpperCase().charCodeAt(0) - 65; // A→0 … Z→25
		if (idx < 0 || idx > 25) return;

		const hue = (hueStart + idx * step) % 360;
		const hsl = `hsl(${(hue + 360) % 360}, ${pct(saturation)}, ${pct(lightness)})`;
		console.debug(`[disable-sidebar] Rainbowizing element: idx=${idx}, char="${ch}", hsl="${hsl}"`);
		el.style.setProperty(property, hsl);

		// breadcrumbs (optional)
		el.dataset.rainbow = `${property}:${hsl}`;
		el.dataset.rainbowIdx = String(idx);
	});
}


// Built-in fuzzy finder for the Settings sidebar
class SidebarFinderModal extends FuzzySuggestModal {
	constructor(app, settingsModalEl) {
		super(app);
		this._settingsModalEl = settingsModalEl;
		this.setPlaceholder('Filter settings…');
	}
	onOpen() {
		super.onOpen?.();
		// Give the fuzzy modal a stable id for CSS targeting
		if (this.modalEl) this.modalEl.id = 'dcps-finder';
	}

	onClose() {
		// Clean up the id so you don’t leave stale attributes around
		if (this.modalEl && this.modalEl.id === 'dcps-finder') {
			this.modalEl.removeAttribute('id');
		}
		super.onClose?.();
	}

	getItems() {
		return this._collectSidebarEntries(this._settingsModalEl);
	}
	getItemText(item) {
		return `${item.name} ${item.group}`;
	}
	onChooseItem(item) {
		try { item.el.click(); } catch (_) { }
	}
	renderSuggestion(value, el) {
		const item = value?.item || value?.entry || value;
		while (el.firstChild) el.removeChild(el.firstChild);
		const row = document.createElement('div');
		row.className = 'dcps-f-item';
		row.setAttribute('data-group', (item.group || '').toLowerCase());
		const name = document.createElement('div'); name.className = 'name'; name.textContent = item.name || '';
		const cat = document.createElement('div'); cat.className = 'cat'; cat.textContent = item.group || '';
		row.appendChild(name); row.appendChild(cat);
		el.appendChild(row);
	}

	_collectSidebarEntries(modal) {
		const header = modal && modal.querySelector('.vertical-tab-header');
		if (!header) return [];
		const entries = [];
		const groups = header.querySelectorAll('.vertical-tab-header-group');
		for (const g of groups) {
			const titleEl = g.querySelector(':scope > .vertical-tab-header-group-title');
			const groupTitle = (() => {
				const tn = [];
				if (titleEl) for (const n of titleEl.childNodes) if (n.nodeType === Node.TEXT_NODE) tn.push(n.textContent || '');
				const s = tn.join(' ').trim();
				return s || (titleEl && titleEl.textContent || '');
			})().trim();
			if (!groupTitle) continue;
			const cat = groupTitle.toLowerCase();
			const icon = cat === 'options' ? '⚙️' : (cat === 'core plugins' ? '🔌' : (cat === 'community plugins' ? '🔌' : '•'));
			const items = g.querySelectorAll(':scope .vertical-tab-header-group-items .vertical-tab-nav-item, :scope > .vertical-tab-nav-item');
			for (const it of items) {
				const nameEl = it.querySelector('.nav-label, .setting-item-name') || it;
				const name = (() => {
					const tn = [];
					if (nameEl) for (const n of nameEl.childNodes) if (n.nodeType === Node.TEXT_NODE) tn.push(n.textContent || '');
					const s = tn.join(' ').trim();
					return s || (nameEl && nameEl.textContent || '').trim();
				})();
				if (!name) continue;
				entries.push({ el: it, name, group: groupTitle, icon });
			}
		}
		return entries;
	}
}



module.exports = DisableFromSidebar;
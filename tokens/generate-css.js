const fs = require('fs');
const path = require('path');

// Helper to convert strings to kebab-case
const toKebabCase = (str) =>
  str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

// Helper to resolve reference strings like "{color.palette.primary.100}"
const resolveReference = (refString, rootObj) => {
  if (typeof refString !== 'string' || !refString.startsWith('{') || !refString.endsWith('}')) {
    return refString;
  }
  const pathParts = refString.slice(1, -1).split('.');
  let current = rootObj;
  for (const part of pathParts) {
    if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
      console.warn(`Warning: Blocked potential prototype pollution key '${part}'`);
      return refString;
    }
    if (current && current[part] !== undefined) {
      current = current[part];
    } else if (current) {
      // Try case-insensitive match
      const lowerPart = part.toLowerCase();
      const matchedKey = Object.keys(current).find(k => k.toLowerCase() === lowerPart);
      if (matchedKey && matchedKey !== '__proto__' && matchedKey !== 'constructor' && matchedKey !== 'prototype' && current[matchedKey] !== undefined) {
        current = current[matchedKey];
      } else {
        console.warn(`Warning: Could not resolve reference ${refString} at part '${part}'`);
        return refString; // Return original if not found
      }
    } else {
      console.warn(`Warning: Could not resolve reference ${refString} at part '${part}'`);
      return refString;
    }
  }
  // Recursively resolve if the resolved value is also a reference
  return resolveReference(current, rootObj);
};

// Process Color Tokens
const processColorTokens = (colorData) => {
  const lightRoles = colorData.color.role.light;
  const darkRoles = colorData.color.role.dark;

  let cssContent = `/* Color Tokens - Light Theme */\n:root {\n`;
  for (const [key, value] of Object.entries(lightRoles)) {
    const resolvedValue = resolveReference(value, colorData);
    cssContent += `  --color-${toKebabCase(key)}: ${resolvedValue};\n`;
  }
  cssContent += `}\n\n`;

  cssContent += `/* Color Tokens - Dark Theme */\n[data-theme="dark"] {\n`;
  for (const [key, value] of Object.entries(darkRoles)) {
    const resolvedValue = resolveReference(value, colorData);
    cssContent += `  --color-${toKebabCase(key)}: ${resolvedValue};\n`;
  }
  cssContent += `}\n\n`;

  return cssContent;
};

// Process Typography Tokens
const processTypographyTokens = (typeData) => {
  let cssContent = `/* Typography Tokens */\n:root {\n`;
  
  // The typography object contains the nested tokens
  const typographyNodes = typeData.typography || {};
  
  for (const [textStyleName, properties] of Object.entries(typographyNodes)) {
    const stylePrefix = toKebabCase(textStyleName);
    
    for (const [propName, propData] of Object.entries(properties)) {
      // Skip description or other non-token properties
      if (!propData || typeof propData !== 'object' || propData.value === undefined) {
        continue;
      }
      
      let value = propData.value;
      
      // Append px to dimension types if they are numeric
      if (propData.type === 'dimension' && typeof value === 'number') {
        value = `${value}px`;
      }
      
      // Some fontFamily strings might need quotes if they have spaces, but usually they are fine without.
      // E.g. Playfair Display -> 'Playfair Display'
      if (propName === 'fontFamily' && value.includes(' ') && !value.includes("'") && !value.includes('"')) {
        value = `'${value}'`;
      }

      cssContent += `  --typography-${stylePrefix}-${toKebabCase(propName)}: ${value};\n`;
    }
    cssContent += '\n';
  }
  cssContent += `}\n`;
  return cssContent;
};

const main = () => {
  try {
    // Read JSON files
    const colorTokensRaw = fs.readFileSync(path.join(__dirname, 'color-token.json'), 'utf8');
    const typeTokensRaw = fs.readFileSync(path.join(__dirname, 'design-tokens.tokens (1).json'), 'utf8');

    const colorData = JSON.parse(colorTokensRaw);
    const typeData = JSON.parse(typeTokensRaw);

    let finalCss = '';
    
    console.log('Processing color tokens...');
    finalCss += processColorTokens(colorData);
    
    console.log('Processing typography tokens...');
    finalCss += processTypographyTokens(typeData);

    // Write to CSS file
    const outputPath = path.join(__dirname, 'theme.css');
    fs.writeFileSync(outputPath, finalCss);
    
    console.log(`Successfully generated CSS at ${outputPath}`);
  } catch (error) {
    console.error('Error processing tokens:', error);
  }
};

main();

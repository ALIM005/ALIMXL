/**
 * ALIMXL Advanced Formula Registry (v2)
 *
 * Connects formula-advanced-2.mjs ... formula-advanced-5.mjs (scalar functions)
 * to lib/formula-core.mjs. Array functions (FREQUENCY, LINEST, LOGEST, TREND,
 * GROWTH) live in formula-advanced-1.mjs and are wired via spill-functions.mjs.
 */

import ADVANCED_FORMULA_FUNCTIONS_2 from "./formula-advanced-2.mjs";
import ADVANCED_FORMULA_FUNCTIONS_3 from "./formula-advanced-3.mjs";
import ADVANCED_FORMULA_FUNCTIONS_4 from "./formula-advanced-4.mjs";
import ADVANCED_FORMULA_FUNCTIONS_5 from "./formula-advanced-5.mjs";

const ADVANCED_FUNCTIONS = {
  ...ADVANCED_FORMULA_FUNCTIONS_2,
  ...ADVANCED_FORMULA_FUNCTIONS_3,
  ...ADVANCED_FORMULA_FUNCTIONS_4,
  ...ADVANCED_FORMULA_FUNCTIONS_5,
};

const FORMULA_ERRORS = ["#VALUE!", "#N/A", "#NUM!", "#DIV/0!", "#REF!", "#NAME?", "#CALC!", "#NULL!", "#SPILL!"];

function isFormulaError(value) {
  return typeof value === "string" && FORMULA_ERRORS.includes(value);
}

export function evalAdvancedFunction(node, helpers) {
  const definition = Object.prototype.hasOwnProperty.call(ADVANCED_FUNCTIONS, node.name)
    ? ADVANCED_FUNCTIONS[node.name]
    : undefined;
  if (!definition) return undefined;

  const { args, ev } = helpers;
  if (args.length < definition.minArgs || args.length > definition.maxArgs) return "#VALUE!";

  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    const value = ev(index);
    if (isFormulaError(value)) return value;
    values.push(value);
  }

  try {
    const result = definition.evaluate(values);
    if (typeof result === "number" && !Number.isFinite(result)) return "#NUM!";
    return result;
  } catch (error) {
    const message = String(error?.message ?? error);
    for (const code of FORMULA_ERRORS) {
      if (message.includes(code)) return code;
    }
    return "#VALUE!";
  }
}

export const ADVANCED_FUNCTION_NAMES = Object.keys(ADVANCED_FUNCTIONS);

export default ADVANCED_FUNCTIONS;

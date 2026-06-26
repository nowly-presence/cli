import enquirer from "enquirer";

const { prompt } = enquirer

export const input = async (message: string, options?: { initial?: string; validate?: (v: string) => boolean | string }): Promise<string> => {
  const { value } = await prompt<{ value: string }>({
    type: "input",
    name: "value",
    message,
    initial: options?.initial,
    validate: options?.validate,
  } as any)
  return value
}

export const select = async <T extends string>(message: string, choices: { name: T; message: string }[]): Promise<T> => {
  const { value } = await prompt<{ value: T }>({
    type: "select",
    name: "value",
    message,
    choices,
  } as any)
  return value
}

export const multiselect = async <T extends string>(message: string, choices: { name: T; message: string }[], options?: { limit?: number }): Promise<T[]> => {
  const { value } = await prompt<{ value: T[] }>({
    type: "multiselect",
    name: "value",
    message,
    choices,
    limit: options?.limit,
  } as any)
  return value
}

export const confirm = async (message: string, initial?: boolean): Promise<boolean> => {
  const { value } = await prompt<{ value: boolean }>({
    type: "confirm",
    name: "value",
    message,
    initial,
  } as any)
  return value
}
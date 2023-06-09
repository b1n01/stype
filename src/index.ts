export type Value = string | undefined | null | boolean;

export type Items = Value | Items[];

export type Action =
  | {
      type: "add" | "remove" | "set";
      value: Items;
    }
  | {
      type: "apply";
      value: Action[];
    };

export type Map = Partial<{
  set: Items;
  add: Items;
  remove: Items;
  apply: Outclass | Outclass[];
}>;

export type Outclass = InstanceType<typeof Out>;

function parse(...items: Items[]): string[] {
  const tokens: string[] = [];

  for (const item of items) {
    if (item instanceof Array) {
      tokens.push(...parse(...item));
    } else if (typeof item === "string") {
      const split = item.split(" ");
      for (const token of split) {
        if (token) tokens.push(token);
      }
    }
  }

  return tokens;
}

class Out {
  #actions: Action[] = [];

  #new(actions: Action[]) {
    return new Out([...this.#actions, ...actions]);
  }

  #process(map: Map): Action[] {
    let actions: Action[] = [];

    let type: keyof Map;
    for (type in map) {
      if (type === "apply") {
        let outs = map.apply!;
        outs = Array.isArray(outs) ? outs : [outs];
        for (const out of outs) {
          actions.push({ type, value: out.#actions });
        }
      } else {
        actions.push({ type, value: map[type] });
      }
    }

    return actions;
  }

  constructor(actions: Action[] = []) {
    this.#actions = actions;
  }

  add(...items: Items[]): Outclass {
    return this.#new([{ type: "add", value: items }]);
  }

  remove(...items: Items[]): Outclass {
    return this.#new([{ type: "remove", value: items }]);
  }

  set(...items: Items[]): Outclass {
    return this.#new([{ type: "set", value: items }]);
  }

  apply(...patches: Outclass[]): Outclass {
    const actions: Action[] = [];
    for (const out of patches) {
      actions.push({ type: "apply", value: out.#actions });
    }
    return this.#new(actions);
  }

  with(map: Map): Outclass {
    return this.#new(this.#process(map));
  }

  parse(...params: (Map | Items)[]): string {
    let tokens = new Set<string>();
    const actions = [...this.#actions];

    for (const param of params) {
      if (
        typeof param === "object" &&
        param !== null &&
        !Array.isArray(param)
      ) {
        actions.push(...this.#process(param));
      } else {
        actions.push({ type: "add", value: param });
      }
    }

    while (actions.length > 0) {
      const action = actions.shift()!;

      if (action.type === "apply") {
        actions.push(...action.value);
      } else {
        const items = parse(action.value);
        if (action.type === "add") {
          for (const item of items) tokens.add(item);
        } else if (action.type === "remove") {
          for (const item of items) tokens.delete(item);
        } else if (action.type === "set") {
          tokens = new Set(items);
        }
      }
    }

    return [...tokens].join(" ");
  }
}

const out = new Out();
export { out };

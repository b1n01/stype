export type Value = string | undefined | null | boolean;

export type Object = {
  [key: string]: Value | List | Object;
};

export type Item = Value | List | Object;

export type List = Array<Item>;

export type ActionType = "add" | "remove" | "set";

export type Action = {
  type: ActionType;
  tokens: Set<string>;
};

export type ActionMap = {
  add: List;
  remove: List;
  set: List;
  patch: Patch;
};

export type Patch = Action[];

function isList(item: unknown): item is List {
  return Object.prototype.toString.call(item) === "[object Array]";
}

function isObject(item: unknown): item is Object {
  return Object.prototype.toString.call(item) === "[object Object]";
}

function isString(item: unknown): item is string {
  return Object.prototype.toString.call(item) === "[object String]";
}

function parse(...params: List): Set<string> {
  const tokens = new Set<string>();

  function eat(param: Item): Set<string> {
    if (isList(param)) {
      return parse(...param);
    } else if (isObject(param)) {
      return parse(...Object.values(param));
    } else if (isString(param)) {
      return new Set(param.split(" ").filter((token) => token));
    } else {
      return new Set();
    }
  }

  for (const param of params) {
    for (const token of eat(param)) {
      tokens.add(token);
    }
  }

  return tokens;
}

class Parser {
  public parse(...params: List): string {
    return [...parse(params)].join(" ");
  }

  get layer(): Layer {
    return new Layer();
  }
}

class Layer {
  private actions: Action[] = [];
  private patches: Patch[] = [];

  public add(...params: List): Layer {
    this.actions.push({ type: "add", tokens: parse(params) });
    return this;
  }

  public remove(...params: List): Layer {
    this.actions.push({ type: "remove", tokens: parse(params) });
    return this;
  }

  public set(...params: List): Layer {
    this.actions.push({ type: "set", tokens: parse(params) });
    return this;
  }

  public apply(...patches: Patch[]): Layer {
    for (const patch of patches) {
      this.patches.push(patch);
    }
    return this;
  }

  public with(actions: ActionMap): Layer {
    let type: keyof ActionMap;
    for (type in actions) {
      if (type === "patch") {
        this.patches.push(actions[type]);
      } else {
        const tokens = parse(actions[type]);
        this.actions.push({ type, tokens });
      }
    }
    return this;
  }

  get patch(): Patch {
    return this.actions;
  }

  public parse(actions: ActionMap): string {
    this.with(actions);

    let tokens = new Set<string>();

    function eat(action: Action) {
      if (action.type === "add") {
        action.tokens.forEach((token) => tokens.add(token));
      } else if (action.type === "remove") {
        action.tokens.forEach((token) => tokens.delete(token));
      } else if (action.type === "set") {
        tokens = action.tokens;
      }
    }

    this.actions.forEach(eat);
    this.patches.forEach((patch) => patch.forEach(eat));

    return [...tokens].join(" ");
  }
}

const s = new Parser();
export { s };

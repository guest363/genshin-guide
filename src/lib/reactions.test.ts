import { describe, expect, it } from "vitest";
import {
  applyElement,
  EMPTY_FIELD,
  EMPTY_STATE,
  MAX_CORES,
  REACTION_ELEMENTS,
  type FieldState,
  type LabFlags,
  type ReactionElement,
  type AuraState,
} from "./reactions";

const NO: LabFlags = { lunar: false, stellar: false };
const LUNAR: LabFlags = { lunar: true, stellar: false };
const STELLAR: LabFlags = { lunar: false, stellar: true };

const pairOf = (a: ReactionElement, b: ReactionElement, flags: LabFlags = NO) => {
  const first = applyElement(EMPTY_STATE, EMPTY_FIELD, a, flags);
  expect(first.reaction).toBeNull();
  return applyElement(first.target, first.field, b, flags);
};

// Повторяет пару «аура → триггер» n раз, пока аура жива после реакции.
const repeatPair = (
  aura: ReactionElement,
  trigger: ReactionElement,
  times: number,
  flags: LabFlags = NO,
): { codes: string[]; target: AuraState; field: FieldState } => {
  let target = EMPTY_STATE;
  let field = EMPTY_FIELD;
  const codes: string[] = [];
  for (let i = 0; i < times; i += 1) {
    if (target.aura !== aura) {
      const laid = applyElement(target, field, aura, flags);
      target = laid.target;
      field = laid.field;
    }
    const hit = applyElement(target, field, trigger, flags);
    target = hit.target;
    field = hit.field;
    codes.push(hit.reaction?.code ?? "none");
  }
  return { codes, target, field };
};

describe("applyElement", () => {
  it("triggers every base pair in both orders", () => {
    const both = (a: ReactionElement, b: ReactionElement, code: string) => {
      expect(pairOf(a, b).reaction?.code).toBe(code);
      expect(pairOf(b, a).reaction?.code).toBe(code);
    };
    both("pyro", "hydro", "vaporize");
    both("pyro", "cryo", "melt");
    both("pyro", "electro", "overloaded");
    both("hydro", "electro", "electro-charged");
    both("cryo", "electro", "superconduct");
    both("pyro", "dendro", "burning");
    both("hydro", "dendro", "bloom");
    both("dendro", "electro", "quicken");
  });

  it("scales amplify notes by the triggering element", () => {
    expect(pairOf("hydro", "pyro").reaction?.note).toContain("×2");
    expect(pairOf("pyro", "hydro").reaction?.note).toContain("×1,5");
    expect(pairOf("cryo", "pyro").reaction?.note).toContain("×2");
    expect(pairOf("pyro", "cryo").reaction?.note).toContain("×1,5");
  });

  it("bloom spawns one core per trigger and caps the field at five", () => {
    const { target } = repeatPair("hydro", "dendro", 7);
    expect(target.cores).toBe(MAX_CORES);
  });

  it("hyperbloom spends a single core, burgeon detonates them all", () => {
    const grown = repeatPair("hydro", "dendro", 3);
    expect(grown.target.cores).toBe(3);

    const hyper = applyElement(grown.target, grown.field, "electro");
    expect(hyper.reaction?.code).toBe("hyperbloom");
    expect(hyper.target.cores).toBe(2);

    const hyper2 = applyElement(hyper.target, hyper.field, "electro");
    expect(hyper2.reaction?.code).toBe("hyperbloom");
    expect(hyper2.target.cores).toBe(1);

    const burgeon = applyElement(hyper2.target, hyper2.field, "pyro");
    expect(burgeon.reaction?.code).toBe("burgeon");
    expect(burgeon.target.cores).toBe(0);
  });

  it("electro-charged keeps both auras and ticks on repeat hits", () => {
    const ec = pairOf("hydro", "electro");
    expect(ec.reaction?.code).toBe("electro-charged");
    expect(ec.target.aura).toBe("hydro");
    expect(ec.target.ec).toBe("electro");

    const tick = applyElement(ec.target, ec.field, "electro");
    expect(tick.reaction?.code).toBe("electro-charged");
    expect(tick.target.aura).toBe("hydro");
    expect(tick.target.ec).toBe("electro");

    const tick2 = applyElement(ec.target, ec.field, "hydro");
    expect(tick2.reaction?.code).toBe("electro-charged");
  });

  it("third elements break up the electro-charged pair", () => {
    const ec = pairOf("hydro", "electro");

    const vape = applyElement(ec.target, ec.field, "pyro");
    expect(vape.reaction?.code).toBe("vaporize");
    expect(vape.reaction?.note).toContain("×2");
    expect(vape.target.ec).toBeNull();
    expect(vape.target.aura).toBe("electro");

    const frozen = applyElement(ec.target, ec.field, "cryo");
    expect(frozen.reaction?.code).toBe("freeze");
    expect(frozen.target.frozen).toBe(true);

    const quickened = applyElement(ec.target, ec.field, "dendro");
    expect(quickened.reaction?.code).toBe("quicken");
    expect(quickened.target.quicken).toBe(true);

    const swirl = applyElement(ec.target, ec.field, "anemo");
    expect(swirl.reaction?.code).toBe("swirl:hydro+electro");

    const crystal = applyElement(ec.target, ec.field, "geo");
    expect(crystal.reaction?.code).toBe("crystallize:electro");
  });

  it("freeze holds under swirl, crystallize and superconduct, melts to pyro", () => {
    const frozen = pairOf("hydro", "cryo");
    expect(frozen.reaction?.code).toBe("freeze");

    const swirl = applyElement(frozen.target, frozen.field, "anemo");
    expect(swirl.reaction?.code).toBe("swirl:cryo");
    expect(swirl.target.frozen).toBe(true);

    const crystal = applyElement(frozen.target, frozen.field, "geo");
    expect(crystal.reaction?.code).toBe("crystallize:cryo");
    expect(crystal.target.frozen).toBe(true);

    const sc = applyElement(frozen.target, frozen.field, "electro");
    expect(sc.reaction?.code).toBe("superconduct");
    expect(sc.target.frozen).toBe(true);

    const kept = applyElement(frozen.target, frozen.field, "hydro");
    expect(kept.reaction).toBeNull();
    expect(kept.target.frozen).toBe(true);

    const melt = applyElement(frozen.target, frozen.field, "pyro");
    expect(melt.reaction?.code).toBe("melt");
    expect(melt.reaction?.note).toContain("×2");
    expect(melt.target.frozen).toBe(false);
  });

  it("awakens with quicken, then aggravate and spread keep the state", () => {
    const quicken = pairOf("dendro", "electro");
    expect(quicken.reaction?.code).toBe("quicken");
    expect(quicken.target.quicken).toBe(true);

    const aggravate = applyElement(quicken.target, quicken.field, "electro");
    expect(aggravate.reaction?.code).toBe("aggravate");
    expect(aggravate.target.quicken).toBe(true);

    const spread = applyElement(quicken.target, quicken.field, "dendro");
    expect(spread.reaction?.code).toBe("spread");
    expect(spread.target.quicken).toBe(true);
  });

  it("hydro blooms beside the quicken, pyro burns it away", () => {
    const quicken = pairOf("dendro", "electro");
    const bloom = applyElement(quicken.target, quicken.field, "hydro");
    expect(bloom.reaction?.code).toBe("bloom");
    // цветение живёт рядом с пробуждением — обострение продолжает работать
    expect(bloom.target.quicken).toBe(true);

    // ядро от цветения перехватывает удары: электро уходит в Вегетацию,
    // пиро — в Бутонизацию, и только потом пробуждение отвечает Обострением
    const hyperAfterBloom = applyElement(bloom.target, bloom.field, "electro");
    expect(hyperAfterBloom.reaction?.code).toBe("hyperbloom");
    expect(hyperAfterBloom.target.quicken).toBe(true);

    const aggravate = applyElement(
      hyperAfterBloom.target,
      hyperAfterBloom.field,
      "electro",
    );
    expect(aggravate.reaction?.code).toBe("aggravate");
    expect(aggravate.target.quicken).toBe(true);

    const burning = applyElement(quicken.target, quicken.field, "pyro");
    expect(burning.reaction?.code).toBe("burning");
    expect(burning.target.burning).toBe(true);
    expect(burning.target.quicken).toBe(false);
  });

  it("swirls and crystallizes the four base elements only", () => {
    for (const element of ["pyro", "hydro", "electro", "cryo"] as const) {
      expect(pairOf(element, "anemo").reaction?.code).toBe(`swirl:${element}`);
      expect(pairOf(element, "geo").reaction?.code).toBe(`crystallize:${element}`);
    }
    // anemo and geo are trigger-only: no aura, no reaction on a clean target
    for (const trigger of ["anemo", "geo"] as const) {
      const alone = applyElement(EMPTY_STATE, EMPTY_FIELD, trigger);
      expect(alone.reaction).toBeNull();
      expect(alone.applied).toBe(false);
      expect(alone.target.aura).toBeNull();
    }
    expect(pairOf("dendro", "anemo").reaction).toBeNull();
    expect(pairOf("geo", "dendro").reaction).toBeNull();
  });

  it("does nothing when the same element is reapplied", () => {
    for (const element of REACTION_ELEMENTS) {
      const first = applyElement(EMPTY_STATE, EMPTY_FIELD, element);
      const second = applyElement(first.target, first.field, element);
      expect(second.reaction).toBeNull();
      expect(second.applied).toBe(false);
    }
  });

  it("lunar sign converts the hydro family", () => {
    const ec = pairOf("hydro", "electro", LUNAR);
    expect(ec.reaction?.code).toBe("lunar-charged");
    expect(ec.field.cloud).toBe(true);
    expect(ec.target.aura).toBe("hydro");
    expect(ec.target.ec).toBe("electro");

    const bloom = pairOf("hydro", "dendro", LUNAR);
    expect(bloom.reaction?.code).toBe("lunar-bloom");
    expect(bloom.target.cores).toBe(1);
    expect(bloom.target.dew).toBe(1);

    const crystal = pairOf("hydro", "geo", LUNAR);
    expect(crystal.reaction?.code).toBe("lunar-crystallize");
    expect(crystal.field.veils).toBe(3);
    expect(crystal.target.aura).toBe("hydro");

    // вне гидро-семейства знак луны ничего не меняет
    expect(pairOf("pyro", "cryo", LUNAR).reaction?.code).toBe("melt");
  });

  it("third lunar-crystallize fires the moondrift harmony", () => {
    const { codes, field } = repeatPair("hydro", "geo", 3, LUNAR);
    expect(codes).toEqual([
      "lunar-crystallize",
      "lunar-crystallize",
      "moondrift-harmony",
    ]);
    expect(field.veils).toBe(3);
  });

  it("stellar sign converts the cryo family", () => {
    const sc = pairOf("cryo", "electro", STELLAR);
    expect(sc.reaction?.code).toBe("stellar-conduct");
    expect(sc.field.prism).toBe(true);

    const swirl = pairOf("cryo", "anemo", STELLAR);
    expect(swirl.reaction?.code).toBe("stellar-swirl");
    expect(swirl.field.vortex).toBe(1);

    // вне крио-семейства звёздный блеск ничего не меняет
    expect(pairOf("pyro", "hydro", STELLAR).reaction?.code).toBe("vaporize");
  });

  it("stellar vortex levels up on the third hit and bursts on the sixth", () => {
    const { codes, field, target } = repeatPair("cryo", "anemo", 6, STELLAR);
    expect(codes.filter((c) => c === "stellar-swirl").length).toBe(5);
    expect(codes[5]).toBe("stellar-swirl:burst");
    expect(field.vortex).toBe(0);
    expect(field.vortexCount).toBe(0);
    expect(target.aura).toBe("cryo");
  });
});

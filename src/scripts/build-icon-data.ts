import manifest from "destiny2-manifest/lib/node";
import fs from "fs-extra";
import _ from "lodash";
import {
  manifestMetadataPromise,
  ManifestLanguage,
} from "destiny2-manifest/lib";

const API_KEY = "c3e5fac733944b058c558a0a0ef15a34";

const ICON_LABEL_RE = /(\[[^\]]+\]|[\uE000-\uF8FF])/g;
const ICON_UNICODE_RE = /([\uE000-\uF8FF])/g;

interface IconData {
  localisedIconLabel: string;
  unicodeSymbol: string;
  objectiveHash: number;
}

export default async function buildIconData() {
  manifest.setApiKey(API_KEY);
  manifest.setLanguage("zh-chs");
  await manifest.load();

  const chObjectives = manifest.getAll("DestinyObjectiveDefinition");

  const manifestMetadata = await manifestMetadataPromise;
  const languages = Object.keys(manifestMetadata.mobileWorldContentPaths);

  const allLanguageIconData: { [language: string]: IconData[] } = {};

  for (const lang of languages) {
    console.log(lang);

    manifest.setLanguage(lang as ManifestLanguage);
    await manifest.load();
    const currentLangObjectives = manifest.getAll("DestinyObjectiveDefinition");

    const iconData = Object.values(currentLangObjectives)
      .map((objective): IconData | undefined => {
        const iconLabelMatch = objective.progressDescription?.match(
          ICON_LABEL_RE
        );

        const iconLabel = iconLabelMatch && iconLabelMatch[0];
        const chObjective = chObjectives.find((v) => v.hash === objective.hash);

        if (!chObjective || !iconLabel) {
          return;
        }

        const chIconUnicodeMatch = chObjective.progressDescription?.match(
          ICON_UNICODE_RE
        );

        const chIconUnicode = chIconUnicodeMatch && chIconUnicodeMatch[0];

        if (chIconUnicode) {
          return {
            localisedIconLabel: iconLabel,
            unicodeSymbol: chIconUnicode,
            objectiveHash: objective.hash,
          };
        }
      })
      .reduce((acc, item) => {
        const prevFound = acc.find(
          (v) => v.localisedIconLabel === item?.localisedIconLabel
        );

        if (prevFound || !item) {
          return acc;
        }

        return [...acc, item];
      }, [] as IconData[]);

    allLanguageIconData[lang] = iconData;
  }

  const iconsByLanguage = _.mapValues(allLanguageIconData, (icons) => {
    return icons.map((iconData) => [
      iconData.localisedIconLabel,
      iconData.unicodeSymbol,
    ]);
  });

  await fs.writeFile(
    "./generated-data/icons-by-label.json",
    JSON.stringify(iconsByLanguage)
  );

  const byObjectives: Array<Array<string | number>> = [];

  Object.values(allLanguageIconData).forEach((icons) => {
    icons.forEach((iconData) => {
      const prev = byObjectives.find(
        (v) =>
          v[0] === iconData.objectiveHash && v[1] === iconData.unicodeSymbol
      );

      if (!prev) {
        byObjectives.push([iconData.objectiveHash, iconData.unicodeSymbol]);
      }
    });
  });

  await fs.writeFile(
    "./generated-data/icons-by-objective.json",
    JSON.stringify(byObjectives)
  );
}

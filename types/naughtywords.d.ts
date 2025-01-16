declare module 'naughty-words' {
    interface NaughtyWords {
        ar: string[];
        cs: string[];
        da: string[];
        de: string[];
        en: string[];
        eo: string[];
        es: string[];
        fa: string[];
        fi: string[];
        fil: string[];
        fr: string[];
        'fr-CA-u-sd-caqc': string[];
        hi: string[];
        hu: string[];
        it: string[];
        ja: string[];
        kab: string[];
        ko: string[];
        nl: string[];
        no: string[];
        pl: string[];
        pt: string[];
        ru: string[];
        sv: string[];
        th: string[];
        tlh: string[];
        tr: string[];
        zh: string[];
    }

    const naughtyWords: NaughtyWords;
    export = naughtyWords;
}
use once_cell::sync::Lazy;
use std::collections::HashSet;

// ─── ISO 639-1 language codes ─────────────────────────────────────────────────

static ISO6391: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "aa","ab","ae","af","ak","am","an","ar","as","av","ay","az",
        "ba","be","bg","bh","bi","bm","bn","bo","br","bs",
        "ca","ce","ch","co","cr","cs","cu","cv","cy",
        "da","de","dv","dz",
        "ee","el","en","eo","es","et","eu",
        "fa","ff","fi","fj","fo","fr","fy",
        "ga","gd","gl","gn","gu","gv",
        "ha","he","hi","ho","hr","ht","hu","hy","hz",
        "ia","id","ie","ig","ii","ik","io","is","it","iu",
        "ja","jv",
        "ka","kg","ki","kj","kk","kl","km","kn","ko","kr","ks","ku","kv","kw","ky",
        "la","lb","lg","li","ln","lo","lt","lu","lv",
        "mg","mh","mi","mk","ml","mn","mr","ms","mt","my",
        "na","nb","nd","ne","ng","nl","nn","no","nr","nv","ny",
        "oc","oj","om","or","os",
        "pa","pi","pl","ps","pt",
        "qu",
        "rm","rn","ro","ru","rw",
        "sa","sc","sd","se","sg","si","sk","sl","sm","sn","so","sq","sr","ss","st","su","sv","sw",
        "ta","te","tg","th","ti","tk","tl","tn","to","tr","ts","tt","tw","ty",
        "ug","uk","ur","uz",
        "ve","vi","vo",
        "wa","wo",
        "xh",
        "yi","yo",
        "za","zh","zu",
    ].iter().cloned().collect()
});

pub fn is_iso6391(value: &str) -> bool {
    ISO6391.contains(value)
}

// ─── ISO 3166-1 alpha-2 country codes ────────────────────────────────────────

static ISO31661_ALPHA2: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
        "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ",
        "CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ",
        "DE","DJ","DK","DM","DO","DZ",
        "EC","EE","EG","EH","ER","ES","ET",
        "FI","FJ","FK","FM","FO","FR",
        "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY",
        "HK","HM","HN","HR","HT","HU",
        "ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT",
        "JE","JM","JO","JP",
        "KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ",
        "LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY",
        "MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ",
        "NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ",
        "OM",
        "PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY",
        "QA",
        "RE","RO","RS","RU","RW",
        "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ",
        "TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ",
        "UA","UG","UM","US","UY","UZ",
        "VA","VC","VE","VG","VI","VN","VU",
        "WF","WS",
        "YE","YT",
        "ZA","ZM","ZW",
    ].iter().cloned().collect()
});

pub fn is_iso31661_alpha2(value: &str) -> bool {
    ISO31661_ALPHA2.contains(value)
}

// ─── ISO 3166-1 alpha-3 country codes ────────────────────────────────────────

static ISO31661_ALPHA3: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "AFG","ALA","ALB","DZA","ASM","AND","AGO","AIA","ATA","ATG","ARG","ARM","ABW","AUS","AUT","AZE",
        "BHS","BHR","BGD","BRB","BLR","BEL","BLZ","BEN","BMU","BTN","BOL","BES","BIH","BWA","BVT","BRA",
        "IOT","BRN","BGR","BFA","BDI","KHM","CMR","CAN","CPV","CYM","CAF","TCD","CHL","CHN","CXR","CCK",
        "COL","COM","COG","COD","COK","CRI","CIV","HRV","CUB","CUW","CYP","CZE","DNK","DJI","DMA","DOM",
        "ECU","EGY","SLV","GNQ","ERI","EST","ETH","FLK","FRO","FJI","FIN","FRA","GUF","PYF","ATF","GAB",
        "GMB","GEO","DEU","GHA","GIB","GRC","GRL","GRD","GLP","GUM","GTM","GGY","GIN","GNB","GUY","HTI",
        "HMD","VAT","HND","HKG","HUN","ISL","IND","IDN","IRN","IRQ","IRL","IMN","ISR","ITA","JAM","JPN",
        "JEY","JOR","KAZ","KEN","KIR","PRK","KOR","KWT","KGZ","LAO","LVA","LBN","LSO","LBR","LBY","LIE",
        "LTU","LUX","MAC","MKD","MDG","MWI","MYS","MDV","MLI","MLT","MHL","MTQ","MRT","MUS","MYT","MEX",
        "FSM","MDA","MCO","MNG","MNE","MSR","MAR","MOZ","MMR","NAM","NRU","NPL","NLD","NCL","NZL","NIC",
        "NER","NGA","NIU","NFK","MNP","NOR","OMN","PAK","PLW","PSE","PAN","PNG","PRY","PER","PHL","PCN",
        "POL","PRT","PRI","QAT","REU","ROU","RUS","RWA","BLM","SHN","KNA","LCA","MAF","SPM","VCT","WSM",
        "SMR","STP","SAU","SEN","SRB","SYC","SLE","SGP","SXM","SVK","SVN","SLB","SOM","ZAF","SGS","SSD",
        "ESP","LKA","SDN","SUR","SJM","SWZ","SWE","CHE","SYR","TWN","TJK","TZA","THA","TLS","TGO","TKL",
        "TON","TTO","TUN","TUR","TKM","TCA","TUV","UGA","UKR","ARE","GBR","USA","UMI","URY","UZB","VUT",
        "VEN","VNM","VGB","VIR","WLF","ESH","YEM","ZMB","ZWE",
    ].iter().cloned().collect()
});

pub fn is_iso31661_alpha3(value: &str) -> bool {
    ISO31661_ALPHA3.contains(value)
}

// ─── ISO 3166-1 numeric country codes ────────────────────────────────────────

static ISO31661_NUMERIC: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "004","008","010","012","016","020","024","028","031","032","036","040","044","048","050","051",
        "052","056","060","064","068","070","072","074","076","084","086","090","092","096","100","104",
        "108","112","116","120","124","132","136","140","144","148","152","156","158","162","166","170",
        "174","175","178","180","184","188","191","192","196","203","204","208","212","214","218","222",
        "226","231","232","233","234","238","239","242","246","248","250","254","258","260","262","266",
        "268","270","275","276","288","292","296","300","304","308","312","316","320","324","328","332",
        "334","336","340","344","348","352","356","360","364","368","372","376","380","384","388","392",
        "398","400","404","408","410","414","417","418","422","426","428","430","434","438","440","442",
        "446","450","454","458","462","466","470","474","478","480","484","492","496","498","499","500",
        "504","508","512","516","520","524","528","531","533","534","535","540","548","554","558","562",
        "566","570","574","578","580","581","583","584","585","586","591","598","600","604","608","612",
        "616","620","624","626","630","634","638","642","643","646","652","654","659","660","662","663",
        "666","670","674","678","682","686","688","690","694","702","703","704","705","706","710","716",
        "724","728","729","732","740","744","748","752","756","760","762","764","768","772","776","780",
        "784","788","792","795","796","798","800","804","807","818","826","831","832","833","834","840",
        "850","854","858","860","862","876","882","887","894",
    ].iter().cloned().collect()
});

pub fn is_iso31661_numeric(value: &str) -> bool {
    ISO31661_NUMERIC.contains(value)
}

// ─── ISO 4217 currency codes ─────────────────────────────────────────────────

static ISO4217: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "AED","AFN","ALL","AMD","ANG","AOA","ARS","AUD","AWG","AZN",
        "BAM","BBD","BDT","BGN","BHD","BIF","BMD","BND","BOB","BOV","BRL","BSD","BTN","BWP","BYN","BZD",
        "CAD","CDF","CHE","CHF","CHW","CLF","CLP","CNY","COP","COU","CRC","CUP","CVE","CZK",
        "DJF","DKK","DOP","DZD",
        "EGP","ERN","ETB","EUR",
        "FJD","FKP",
        "GBP","GEL","GHS","GIP","GMD","GNF","GTQ","GYD",
        "HKD","HNL","HTG","HUF",
        "IDR","ILS","INR","IQD","IRR","ISK",
        "JMD","JOD","JPY",
        "KES","KGS","KHR","KMF","KPW","KRW","KWD","KYD","KZT",
        "LAK","LBP","LKR","LRD","LSL","LYD",
        "MAD","MDL","MGA","MKD","MMK","MNT","MOP","MRU","MUR","MVR","MWK","MXN","MXV","MYR","MZN",
        "NAD","NGN","NIO","NOK","NPR","NZD",
        "OMR",
        "PAB","PEN","PGK","PHP","PKR","PLN","PYG",
        "QAR",
        "RON","RSD","RUB","RWF",
        "SAR","SBD","SCR","SDG","SEK","SGD","SHP","SLE","SLL","SOS","SRD","SSP","STN","SVC","SYP","SZL",
        "THB","TJS","TMT","TND","TOP","TRY","TTD","TWD","TZS",
        "UAH","UGX","USD","USN","UYI","UYU","UYW","UZS",
        "VED","VES","VND","VUV",
        "WST",
        "XAF","XAG","XAU","XBA","XBB","XBC","XBD","XCD","XDR","XOF","XPD","XPF","XPT","XSU","XTS","XUA","XXX",
        "YER",
        "ZAR","ZMW","ZWL",
    ].iter().cloned().collect()
});

pub fn is_iso4217(value: &str) -> bool {
    ISO4217.contains(value)
}

// ─── ISO 15924 script codes ───────────────────────────────────────────────────

static ISO15924: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "Adlm","Afak","Aghb","Ahom","Arab","Aran","Armi","Armn","Avst",
        "Bali","Bamu","Bass","Batk","Beng","Bhks","Blis","Bopo","Brah","Brai","Bugi","Buhd",
        "Cakm","Cans","Cari","Cham","Cher","Chrs","Cirt","Copt","Cprt","Cyrl","Cyrs",
        "Deva","Diak","Dogr","Dsrt","Dupl",
        "Egyd","Egyh","Egyp","Elba","Elym","Ethi",
        "Geok","Geor","Glag","Gong","Gonm","Goth","Gran","Grek","Gujr","Guru",
        "Hanb","Hang","Hani","Hano","Hans","Hant","Hatr","Hebr","Hira","Hluw","Hmng","Hmnp","Hrkt","Hung",
        "Inds","Ital",
        "Jamo","Java","Jpan",
        "Kali","Kana","Kawi","Khar","Khmr","Khoj","Knda","Kore","Kthi",
        "Lana","Laoo","Latf","Latg","Latn","Lepc","Limb","Lina","Linb","Lisu","Lyci","Lydi",
        "Mahj","Maka","Mand","Mani","Marc","Medf","Mend","Merc","Mero","Mlym","Modi","Mong","Mroo","Mtei","Mult","Mymr",
        "Nand","Narb","Nbat","Newa","Nkoo","Nshu",
        "Ogam","Olck","Orkh","Orya","Osge","Osma","Ougr",
        "Palm","Pauc","Perm","Phag","Phli","Phlp","Phnx","Prti",
        "Rjng","Rohg","Runr",
        "Samr","Sarb","Saur","Sgnw","Shaw","Shrd","Sidd","Sind","Sinh","Sogd","Sogo","Sora","Soyo","Sund","Sylo","Syrc","Syre","Syrj","Syrn",
        "Tagb","Takr","Tale","Talu","Taml","Tang","Tavt","Telu","Tfng","Tglg","Thaa","Thai","Tibt","Tirh","Toto",
        "Ugar",
        "Vaii","Vith",
        "Wara","Wcho",
        "Xpeo","Xsux",
        "Yezi","Yiii",
        "Zanb","Zinh","Zmth","Zsye","Zsym","Zxxx","Zyyy","Zzzz",
    ].iter().cloned().collect()
});

pub fn is_iso15924(value: &str) -> bool {
    ISO15924.contains(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_iso6391() {
        assert!(is_iso6391("en"));
        assert!(is_iso6391("zh"));
        assert!(!is_iso6391("xx"));
        assert!(!is_iso6391("eng")); // 3-letter, not ISO 639-1
    }

    #[test]
    fn test_iso31661_alpha2() {
        assert!(is_iso31661_alpha2("US"));
        assert!(is_iso31661_alpha2("DE"));
        assert!(!is_iso31661_alpha2("XX"));
        assert!(!is_iso31661_alpha2("us")); // must be uppercase
    }

    #[test]
    fn test_iso31661_alpha3() {
        assert!(is_iso31661_alpha3("USA"));
        assert!(is_iso31661_alpha3("DEU"));
        assert!(!is_iso31661_alpha3("XXX"));
    }

    #[test]
    fn test_iso31661_numeric() {
        assert!(is_iso31661_numeric("840")); // US
        assert!(is_iso31661_numeric("276")); // DE
        assert!(!is_iso31661_numeric("999"));
    }

    #[test]
    fn test_iso4217() {
        assert!(is_iso4217("USD"));
        assert!(is_iso4217("EUR"));
        assert!(!is_iso4217("XXX_INVALID"));
    }

    #[test]
    fn test_iso15924() {
        assert!(is_iso15924("Latn"));
        assert!(is_iso15924("Cyrl"));
        assert!(!is_iso15924("Fake"));
    }
}

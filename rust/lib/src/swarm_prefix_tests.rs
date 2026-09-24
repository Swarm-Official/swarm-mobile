use super::parse_address;

const LEGACY: &str = "utest18z7h64gzyjgfpuch39v2dd3g766scdzc0qdsa9qj5tawzd0n6d88dl3vyyx6elk6mcemdd6wtkd3unnvutd3sdpd3jjvgs7lz4uas7rv25d26pnryp6tczmfapqze6ggdy7645kkevh8r980zxzcyj6d9dsplukx0htsym5xsqtwaka4";

#[test]
fn tests_swarm_encoding_when_a_legacy_address_is_parsed() {
    let legacy: serde_json::Value =
        serde_json::from_str(&parse_address(LEGACY.to_owned()).unwrap()).unwrap();
    assert_eq!(legacy["status"], "success");
    assert_eq!(legacy["chain_name"], "swarm-testnet");
    let encoded = legacy["shielded_only_ua"].as_str().unwrap();
    assert!(encoded.starts_with("swarm1"));
    let canonical: serde_json::Value =
        serde_json::from_str(&parse_address(encoded.to_owned()).unwrap()).unwrap();
    assert_eq!(canonical["status"], "success");
    assert_eq!(canonical["shielded_only_ua"], encoded);
    assert_eq!(
        canonical["receivers_available"],
        serde_json::json!(["orchard"])
    );

    let mixed = encoded.replacen("swarm", "SwarM", 1);
    let rejected: serde_json::Value = serde_json::from_str(&parse_address(mixed).unwrap()).unwrap();
    assert_eq!(rejected["status"], "Invalid address");
}

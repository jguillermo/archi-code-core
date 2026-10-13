mod v8_sort;

use std::cmp::Ordering;

use crate::encoding::{from_base64_lenient, to_base64};
use crate::error::{CryptoError, CryptoResult};

const CHARACTER_SET: &[u8; 65] =
    b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
const CHARACTER_SET_LENGTH: usize = CHARACTER_SET.len();
const MODULUS: u64 = 233_280;
const MAX_ARRAY_LENGTH: f64 = 4_294_967_295.0;

pub struct Lcg {
    seed: u64,
}

impl Lcg {
    pub fn new(seed: u64) -> Self {
        Lcg { seed }
    }

    pub fn next_value(&mut self) -> f64 {
        self.seed = (self.seed * 9301 + 49297) % MODULUS;
        self.seed as f64 / MODULUS as f64
    }

    fn index(&mut self, length: usize) -> usize {
        (self.next_value() * length as f64).floor() as usize
    }
}

fn key_to_seed(key: &str) -> u64 {
    key.chars().fold(0u64, |seed, unit| {
        let first_code_unit = first_utf16_unit(unit) as u64;
        (seed * 31 + first_code_unit) % MODULUS
    })
}

fn first_utf16_unit(unit: char) -> u16 {
    let mut buffer = [0u16; 2];
    unit.encode_utf16(&mut buffer)[0]
}

struct Wheel {
    mapping: Vec<usize>,
    inverse: Vec<usize>,
    turnover: usize,
    position: usize,
}

pub struct CryptoEngine {
    plugboard: Vec<usize>,
    reflector: Vec<usize>,
    wheels: Vec<Wheel>,
}

fn pair_up(random: &mut Lcg) -> (Vec<Option<usize>>, Option<usize>) {
    let mut indices: Vec<usize> = (0..CHARACTER_SET_LENGTH).collect();
    let mut mapping = vec![None; CHARACTER_SET_LENGTH];
    while indices.len() > 1 {
        let a = indices.remove(random.index(indices.len()));
        let b = indices.remove(random.index(indices.len()));
        mapping[a] = Some(b);
        mapping[b] = Some(a);
    }
    (mapping, indices.first().copied())
}

fn first_number(text: &str) -> f64 {
    let digits: String = text
        .chars()
        .skip_while(|unit| !unit.is_ascii_digit())
        .take_while(|unit| unit.is_ascii_digit())
        .collect();
    if digits.is_empty() {
        0.0
    } else {
        digits.parse::<f64>().unwrap_or(f64::INFINITY)
    }
}

fn wheel_count(encoded: &str) -> CryptoResult<usize> {
    let count = first_number(encoded) + 3.0;
    if count > MAX_ARRAY_LENGTH {
        return Err(CryptoError::invalid_key(
            "Invalid array length: the seed key asks for too many wheels.",
        ));
    }
    Ok(count as usize)
}

fn shuffle_order(random: &mut Lcg) -> Ordering {
    let value = random.next_value() - 0.5;
    value.partial_cmp(&0.0).unwrap_or(Ordering::Equal)
}

impl CryptoEngine {
    pub fn new(seed_key: &str) -> CryptoResult<Self> {
        let encoded = to_base64(seed_key.as_bytes());
        let mut plugboard_random = Lcg::new(key_to_seed(&encoded));
        let (plugboard, _) = pair_up(&mut plugboard_random);
        let plugboard = plugboard
            .iter()
            .enumerate()
            .map(|(index, mapped)| mapped.unwrap_or(index))
            .collect();

        let mut reflector_random = Lcg::new(key_to_seed(&format!("{encoded}_reflector")));
        let (reflector, remaining) = pair_up(&mut reflector_random);
        let reflector = reflector
            .iter()
            .enumerate()
            .map(|(index, mapped)| match mapped {
                Some(value) => *value,
                None => remaining.unwrap_or(index),
            })
            .collect();

        let wheels = (0..wheel_count(&encoded)?)
            .map(|index| Self::create_wheel(&encoded, index))
            .collect();

        Ok(CryptoEngine {
            plugboard,
            reflector,
            wheels,
        })
    }

    fn create_wheel(encoded: &str, index: usize) -> Wheel {
        let mut random = Lcg::new(key_to_seed(&format!("{encoded}{index}")));
        let mut mapping: Vec<usize> = (0..CHARACTER_SET_LENGTH).collect();
        v8_sort::sort(&mut mapping, |_, _| shuffle_order(&mut random));
        let turnover = random.index(CHARACTER_SET_LENGTH);
        let position = random.index(CHARACTER_SET_LENGTH);
        let mut inverse = vec![0; CHARACTER_SET_LENGTH];
        for (input, output) in mapping.iter().enumerate() {
            inverse[*output] = input;
        }
        Wheel {
            mapping,
            inverse,
            turnover,
            position,
        }
    }

    pub fn encode(&self, message: &str) -> String {
        self.transform(&to_base64(message.as_bytes()))
    }

    pub fn decode(&self, message: &str) -> String {
        let bytes = from_base64_lenient(&self.transform(message));
        String::from_utf8_lossy(&bytes).into_owned()
    }

    fn transform(&self, message: &str) -> String {
        let mut positions: Vec<usize> = self.wheels.iter().map(|wheel| wheel.position).collect();
        message
            .chars()
            .map(|unit| {
                let Some(mut index) = CHARACTER_SET.iter().position(|c| *c as char == unit) else {
                    return unit;
                };
                self.advance(&mut positions);
                index = self.plugboard[index];
                for (wheel, position) in self.wheels.iter().zip(&positions) {
                    let shifted = (index + position) % CHARACTER_SET_LENGTH;
                    index = (wheel.mapping[shifted] + CHARACTER_SET_LENGTH - position)
                        % CHARACTER_SET_LENGTH;
                }
                index = self.reflector[index];
                for (wheel, position) in self.wheels.iter().zip(&positions).rev() {
                    let shifted = (index + position) % CHARACTER_SET_LENGTH;
                    index = (wheel.inverse[shifted] + CHARACTER_SET_LENGTH - position)
                        % CHARACTER_SET_LENGTH;
                }
                index = self.plugboard[index];
                CHARACTER_SET[index % CHARACTER_SET_LENGTH] as char
            })
            .collect()
    }

    fn advance(&self, positions: &mut [usize]) {
        let last = positions.len() - 1;
        for index in (0..=last).rev() {
            if index == last || positions[index + 1] == self.wheels[index + 1].turnover {
                positions[index] = (positions[index] + 1) % CHARACTER_SET_LENGTH;
            } else {
                break;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    fn fixtures() -> Value {
        serde_json::from_str(include_str!("../../../test/fixtures/legacy.json")).unwrap()
    }

    fn numbers(value: &Value) -> Vec<usize> {
        value
            .as_array()
            .unwrap()
            .iter()
            .map(|item| item.as_u64().unwrap() as usize)
            .collect()
    }

    #[test]
    fn builds_the_same_machine_as_the_javascript_engine() {
        for case in fixtures()["engine"].as_array().unwrap() {
            let engine = CryptoEngine::new(case["key"].as_str().unwrap()).unwrap();
            assert_eq!(engine.reflector, numbers(&case["reflector"]));
            let wheels = case["wheels"].as_array().unwrap();
            assert_eq!(engine.wheels.len(), wheels.len());
            for (wheel, expected) in engine.wheels.iter().zip(wheels) {
                assert_eq!(wheel.mapping, numbers(&expected["mapping"]));
                assert_eq!(
                    wheel.turnover as u64,
                    expected["turnover"].as_u64().unwrap()
                );
                assert_eq!(
                    wheel.position as u64,
                    expected["position"].as_u64().unwrap()
                );
            }
            for pair in case["plugboard"].as_array().unwrap() {
                let pair = numbers(pair);
                assert_eq!(engine.plugboard[pair[0]], pair[1]);
            }
        }
    }

    #[test]
    fn encodes_exactly_like_the_javascript_engine() {
        for case in fixtures()["engine"].as_array().unwrap() {
            let engine = CryptoEngine::new(case["key"].as_str().unwrap()).unwrap();
            for sample in case["samples"].as_array().unwrap() {
                let message = sample["message"].as_str().unwrap();
                let encoded = sample["encoded"].as_str().unwrap();
                assert_eq!(engine.encode(message), encoded);
                assert_eq!(engine.decode(encoded), message);
            }
        }
    }

    #[test]
    fn decodes_arbitrary_text_exactly_like_the_javascript_engine() {
        for case in fixtures()["decodeSamples"].as_array().unwrap() {
            let engine = CryptoEngine::new(case["key"].as_str().unwrap()).unwrap();
            for sample in case["samples"].as_array().unwrap() {
                let input = sample["input"].as_str().unwrap();
                assert_eq!(engine.decode(input), sample["decoded"].as_str().unwrap());
            }
        }
    }

    #[test]
    fn rejects_a_seed_key_that_asks_for_an_impossible_number_of_wheels() {
        let error = wheel_count("a99999999999").err().unwrap();
        assert_eq!(error.code, crate::error::ErrorCode::InvalidKey);
        assert_eq!(wheel_count("YW5i").unwrap(), 8);
    }

    #[test]
    fn reads_the_first_number_of_the_encoded_key() {
        assert_eq!(first_number("YW5i"), 5.0);
        assert_eq!(first_number("dGVzdA=="), 0.0);
        assert_eq!(first_number("a007b12"), 7.0);
    }
}

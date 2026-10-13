use std::cmp::Ordering;

const MIN_GALLOP_WINS: usize = 7;

struct Run {
    base: usize,
    length: usize,
}

struct TimSort<'a, T: Copy, F: FnMut(T, T) -> Ordering> {
    work: &'a mut [T],
    compare: F,
    runs: Vec<Run>,
    min_gallop: usize,
}

pub fn sort<T: Copy, F: FnMut(T, T) -> Ordering>(items: &mut [T], compare: F) {
    if items.len() < 2 {
        return;
    }
    let mut state = TimSort {
        work: items,
        compare,
        runs: Vec::new(),
        min_gallop: MIN_GALLOP_WINS,
    };
    state.run();
}

fn min_run_length(mut length: usize) -> usize {
    let mut low_bit = 0;
    while length >= 64 {
        low_bit |= length & 1;
        length >>= 1;
    }
    length + low_bit
}

impl<T: Copy, F: FnMut(T, T) -> Ordering> TimSort<'_, T, F> {
    fn less(&mut self, a: T, b: T) -> bool {
        (self.compare)(a, b) == Ordering::Less
    }

    fn run(&mut self) {
        let mut low = 0;
        let mut remaining = self.work.len();
        let min_run = min_run_length(remaining);
        while remaining != 0 {
            let mut current = self.count_and_make_run(low, low + remaining);
            if current < min_run {
                let forced = min_run.min(remaining);
                self.binary_insertion_sort(low, low + current, low + forced);
                current = forced;
            }
            self.runs.push(Run {
                base: low,
                length: current,
            });
            self.merge_collapse();
            low += current;
            remaining -= current;
        }
        self.merge_force_collapse();
    }

    fn count_and_make_run(&mut self, low_arg: usize, high: usize) -> usize {
        let low = low_arg + 1;
        if low == high {
            return 1;
        }
        let mut run_length = 2;
        let element_low = self.work[low];
        let element_low_pre = self.work[low - 1];
        let descending = self.less(element_low, element_low_pre);
        let mut previous = element_low;
        for index in low + 1..high {
            let current = self.work[index];
            let order_less = self.less(current, previous);
            if descending {
                if !order_less {
                    break;
                }
            } else if order_less {
                break;
            }
            previous = current;
            run_length += 1;
        }
        if descending {
            self.work[low_arg..low_arg + run_length].reverse();
        }
        run_length
    }

    fn binary_insertion_sort(&mut self, low: usize, start_arg: usize, high: usize) {
        let mut start = if low == start_arg {
            start_arg + 1
        } else {
            start_arg
        };
        while start < high {
            let mut left = low;
            let mut right = start;
            let pivot = self.work[start];
            while left < right {
                let middle = left + ((right - left) >> 1);
                if self.less(pivot, self.work[middle]) {
                    right = middle;
                } else {
                    left = middle + 1;
                }
            }
            let mut position = start;
            while position > left {
                self.work[position] = self.work[position - 1];
                position -= 1;
            }
            self.work[left] = pivot;
            start += 1;
        }
    }

    fn run_invariant_established(&self, n: usize) -> bool {
        if n < 2 {
            return true;
        }
        self.runs[n - 2].length > self.runs[n - 1].length + self.runs[n].length
    }

    fn merge_collapse(&mut self) {
        while self.runs.len() > 1 {
            let mut n = self.runs.len() - 2;
            if !self.run_invariant_established(n + 1) || !self.run_invariant_established(n) {
                if self.runs[n - 1].length < self.runs[n + 1].length {
                    n -= 1;
                }
                self.merge_at(n);
            } else if self.runs[n].length <= self.runs[n + 1].length {
                self.merge_at(n);
            } else {
                break;
            }
        }
    }

    fn merge_force_collapse(&mut self) {
        while self.runs.len() > 1 {
            let mut n = self.runs.len() - 2;
            if n > 0 && self.runs[n - 1].length < self.runs[n + 1].length {
                n -= 1;
            }
            self.merge_at(n);
        }
    }

    fn merge_at(&mut self, i: usize) {
        let mut base_a = self.runs[i].base;
        let mut length_a = self.runs[i].length;
        let base_b = self.runs[i + 1].base;
        let mut length_b = self.runs[i + 1].length;
        self.runs[i].length = length_a + length_b;
        self.runs.remove(i + 1);

        let key_right = self.work[base_b];
        let k = self.gallop_right_work(key_right, base_a, length_a, 0);
        base_a += k;
        length_a -= k;
        if length_a == 0 {
            return;
        }
        let key_left = self.work[base_a + length_a - 1];
        length_b = self.gallop_left_work(key_left, base_b, length_b, length_b - 1);
        if length_b == 0 {
            return;
        }
        if length_a <= length_b {
            self.merge_low(base_a, length_a, base_b, length_b);
        } else {
            self.merge_high(base_a, length_a, base_b, length_b);
        }
    }

    fn gallop_left_work(&mut self, key: T, base: usize, length: usize, hint: usize) -> usize {
        let snapshot: Vec<T> = self.work[base..base + length].to_vec();
        gallop_left(&mut self.compare, &snapshot, key, 0, length, hint)
    }

    fn gallop_right_work(&mut self, key: T, base: usize, length: usize, hint: usize) -> usize {
        let snapshot: Vec<T> = self.work[base..base + length].to_vec();
        gallop_right(&mut self.compare, &snapshot, key, 0, length, hint)
    }

    fn merge_low(
        &mut self,
        base_a: usize,
        length_a_arg: usize,
        base_b: usize,
        length_b_arg: usize,
    ) {
        let mut length_a = length_a_arg;
        let mut length_b = length_b_arg;
        let temp: Vec<T> = self.work[base_a..base_a + length_a].to_vec();
        let mut dest = base_a;
        let mut cursor_temp = 0;
        let mut cursor_b = base_b;

        self.work[dest] = self.work[cursor_b];
        dest += 1;
        cursor_b += 1;

        enum Exit {
            Succeed,
            CopyB,
        }

        let exit = 'merge: {
            length_b -= 1;
            if length_b == 0 {
                break 'merge Exit::Succeed;
            }
            if length_a == 1 {
                break 'merge Exit::CopyB;
            }
            let mut min_gallop = self.min_gallop;
            loop {
                let mut wins_a = 0;
                let mut wins_b = 0;
                loop {
                    if self.less(self.work[cursor_b], temp[cursor_temp]) {
                        self.work[dest] = self.work[cursor_b];
                        dest += 1;
                        cursor_b += 1;
                        wins_b += 1;
                        length_b -= 1;
                        wins_a = 0;
                        if length_b == 0 {
                            break 'merge Exit::Succeed;
                        }
                        if wins_b >= min_gallop {
                            break;
                        }
                    } else {
                        self.work[dest] = temp[cursor_temp];
                        dest += 1;
                        cursor_temp += 1;
                        wins_a += 1;
                        length_a -= 1;
                        wins_b = 0;
                        if length_a == 1 {
                            break 'merge Exit::CopyB;
                        }
                        if wins_a >= min_gallop {
                            break;
                        }
                    }
                }
                min_gallop += 1;
                let mut first_iteration = true;
                while wins_a >= MIN_GALLOP_WINS || wins_b >= MIN_GALLOP_WINS || first_iteration {
                    first_iteration = false;
                    min_gallop = 1.max(min_gallop - 1);
                    self.min_gallop = min_gallop;

                    let key = self.work[cursor_b];
                    wins_a = gallop_right(&mut self.compare, &temp, key, cursor_temp, length_a, 0);
                    if wins_a > 0 {
                        self.work[dest..dest + wins_a]
                            .copy_from_slice(&temp[cursor_temp..cursor_temp + wins_a]);
                        dest += wins_a;
                        cursor_temp += wins_a;
                        length_a -= wins_a;
                        if length_a == 1 {
                            break 'merge Exit::CopyB;
                        }
                        if length_a == 0 {
                            break 'merge Exit::Succeed;
                        }
                    }
                    self.work[dest] = self.work[cursor_b];
                    dest += 1;
                    cursor_b += 1;
                    length_b -= 1;
                    if length_b == 0 {
                        break 'merge Exit::Succeed;
                    }

                    let key = temp[cursor_temp];
                    let snapshot: Vec<T> = self.work[cursor_b..cursor_b + length_b].to_vec();
                    wins_b = gallop_left(&mut self.compare, &snapshot, key, 0, length_b, 0);
                    if wins_b > 0 {
                        self.work.copy_within(cursor_b..cursor_b + wins_b, dest);
                        dest += wins_b;
                        cursor_b += wins_b;
                        length_b -= wins_b;
                        if length_b == 0 {
                            break 'merge Exit::Succeed;
                        }
                    }
                    self.work[dest] = temp[cursor_temp];
                    dest += 1;
                    cursor_temp += 1;
                    length_a -= 1;
                    if length_a == 1 {
                        break 'merge Exit::CopyB;
                    }
                }
                min_gallop += 1;
                self.min_gallop = min_gallop;
            }
        };

        match exit {
            Exit::Succeed => {
                if length_a > 0 {
                    self.work[dest..dest + length_a]
                        .copy_from_slice(&temp[cursor_temp..cursor_temp + length_a]);
                }
            }
            Exit::CopyB => {
                self.work.copy_within(cursor_b..cursor_b + length_b, dest);
                self.work[dest + length_b] = temp[cursor_temp];
            }
        }
    }

    fn merge_high(
        &mut self,
        base_a: usize,
        length_a_arg: usize,
        base_b: usize,
        length_b_arg: usize,
    ) {
        let mut length_a = length_a_arg as isize;
        let mut length_b = length_b_arg as isize;
        let temp: Vec<T> = self.work[base_b..base_b + length_b_arg].to_vec();
        let mut dest = (base_b + length_b_arg) as isize - 1;
        let mut cursor_temp = length_b - 1;
        let mut cursor_a = (base_a + length_a_arg) as isize - 1;

        self.work[dest as usize] = self.work[cursor_a as usize];
        dest -= 1;
        cursor_a -= 1;

        enum Exit {
            Succeed,
            CopyA,
        }

        let exit = 'merge: {
            length_a -= 1;
            if length_a == 0 {
                break 'merge Exit::Succeed;
            }
            if length_b == 1 {
                break 'merge Exit::CopyA;
            }
            let mut min_gallop = self.min_gallop;
            loop {
                let mut wins_a: isize = 0;
                let mut wins_b: isize = 0;
                loop {
                    if self.less(temp[cursor_temp as usize], self.work[cursor_a as usize]) {
                        self.work[dest as usize] = self.work[cursor_a as usize];
                        dest -= 1;
                        cursor_a -= 1;
                        wins_a += 1;
                        length_a -= 1;
                        wins_b = 0;
                        if length_a == 0 {
                            break 'merge Exit::Succeed;
                        }
                        if wins_a >= min_gallop as isize {
                            break;
                        }
                    } else {
                        self.work[dest as usize] = temp[cursor_temp as usize];
                        dest -= 1;
                        cursor_temp -= 1;
                        wins_b += 1;
                        length_b -= 1;
                        wins_a = 0;
                        if length_b == 1 {
                            break 'merge Exit::CopyA;
                        }
                        if wins_b >= min_gallop as isize {
                            break;
                        }
                    }
                }
                min_gallop += 1;
                let mut first_iteration = true;
                while wins_a >= MIN_GALLOP_WINS as isize
                    || wins_b >= MIN_GALLOP_WINS as isize
                    || first_iteration
                {
                    first_iteration = false;
                    min_gallop = 1.max(min_gallop - 1);
                    self.min_gallop = min_gallop;

                    let key = temp[cursor_temp as usize];
                    let snapshot: Vec<T> = self.work[base_a..base_a + length_a as usize].to_vec();
                    let k = gallop_right(
                        &mut self.compare,
                        &snapshot,
                        key,
                        0,
                        length_a as usize,
                        length_a as usize - 1,
                    ) as isize;
                    wins_a = length_a - k;
                    if wins_a > 0 {
                        dest -= wins_a;
                        cursor_a -= wins_a;
                        let from = (cursor_a + 1) as usize;
                        self.work
                            .copy_within(from..from + wins_a as usize, (dest + 1) as usize);
                        length_a -= wins_a;
                        if length_a == 0 {
                            break 'merge Exit::Succeed;
                        }
                    }
                    self.work[dest as usize] = temp[cursor_temp as usize];
                    dest -= 1;
                    cursor_temp -= 1;
                    length_b -= 1;
                    if length_b == 1 {
                        break 'merge Exit::CopyA;
                    }

                    let key = self.work[cursor_a as usize];
                    let k = gallop_left(
                        &mut self.compare,
                        &temp,
                        key,
                        0,
                        length_b as usize,
                        length_b as usize - 1,
                    ) as isize;
                    wins_b = length_b - k;
                    if wins_b > 0 {
                        dest -= wins_b;
                        cursor_temp -= wins_b;
                        let from = (cursor_temp + 1) as usize;
                        let to = (dest + 1) as usize;
                        self.work[to..to + wins_b as usize]
                            .copy_from_slice(&temp[from..from + wins_b as usize]);
                        length_b -= wins_b;
                        if length_b == 1 {
                            break 'merge Exit::CopyA;
                        }
                        if length_b == 0 {
                            break 'merge Exit::Succeed;
                        }
                    }
                    self.work[dest as usize] = self.work[cursor_a as usize];
                    dest -= 1;
                    cursor_a -= 1;
                    length_a -= 1;
                    if length_a == 0 {
                        break 'merge Exit::Succeed;
                    }
                }
                min_gallop += 1;
                self.min_gallop = min_gallop;
            }
        };

        match exit {
            Exit::Succeed => {
                if length_b > 0 {
                    let to = (dest - (length_b - 1)) as usize;
                    self.work[to..to + length_b as usize]
                        .copy_from_slice(&temp[0..length_b as usize]);
                }
            }
            Exit::CopyA => {
                dest -= length_a;
                cursor_a -= length_a;
                let from = (cursor_a + 1) as usize;
                self.work
                    .copy_within(from..from + length_a as usize, (dest + 1) as usize);
                self.work[dest as usize] = temp[cursor_temp as usize];
            }
        }
    }
}

fn gallop_left<T: Copy, F: FnMut(T, T) -> Ordering>(
    compare: &mut F,
    array: &[T],
    key: T,
    base: usize,
    length: usize,
    hint: usize,
) -> usize {
    let less = |compare: &mut F, a: T, b: T| compare(a, b) == Ordering::Less;
    let mut low = 0usize;
    let mut high = 1usize;
    let last_offset: usize;
    let offset: usize;
    if less(compare, array[base + hint], key) {
        let max_offset = length - hint;
        while high < max_offset {
            if !less(compare, array[base + hint + high], key) {
                break;
            }
            low = high;
            high = (high << 1) + 1;
        }
        if high > max_offset {
            high = max_offset;
        }
        last_offset = low + hint + 1;
        offset = high + hint;
    } else {
        let max_offset = hint + 1;
        while high < max_offset {
            if less(compare, array[base + hint - high], key) {
                break;
            }
            low = high;
            high = (high << 1) + 1;
        }
        if high > max_offset {
            high = max_offset;
        }
        let start = hint as isize - high as isize;
        last_offset = (start + 1) as usize;
        offset = hint - low;
    }
    binary_left(compare, array, key, base, last_offset, offset)
}

fn binary_left<T: Copy, F: FnMut(T, T) -> Ordering>(
    compare: &mut F,
    array: &[T],
    key: T,
    base: usize,
    mut last_offset: usize,
    mut offset: usize,
) -> usize {
    while last_offset < offset {
        let middle = last_offset + ((offset - last_offset) >> 1);
        if compare(array[base + middle], key) == Ordering::Less {
            last_offset = middle + 1;
        } else {
            offset = middle;
        }
    }
    offset
}

fn gallop_right<T: Copy, F: FnMut(T, T) -> Ordering>(
    compare: &mut F,
    array: &[T],
    key: T,
    base: usize,
    length: usize,
    hint: usize,
) -> usize {
    let less = |compare: &mut F, a: T, b: T| compare(a, b) == Ordering::Less;
    let mut low = 0usize;
    let mut high = 1usize;
    let last_offset: usize;
    let offset: usize;
    if less(compare, key, array[base + hint]) {
        let max_offset = hint + 1;
        while high < max_offset {
            if !less(compare, key, array[base + hint - high]) {
                break;
            }
            low = high;
            high = (high << 1) + 1;
        }
        if high > max_offset {
            high = max_offset;
        }
        let start = hint as isize - high as isize;
        last_offset = (start + 1) as usize;
        offset = hint - low;
    } else {
        let max_offset = length - hint;
        while high < max_offset {
            if less(compare, key, array[base + hint + high]) {
                break;
            }
            low = high;
            high = (high << 1) + 1;
        }
        if high > max_offset {
            high = max_offset;
        }
        last_offset = low + hint + 1;
        offset = high + hint;
    }
    binary_right(compare, array, key, base, last_offset, offset)
}

fn binary_right<T: Copy, F: FnMut(T, T) -> Ordering>(
    compare: &mut F,
    array: &[T],
    key: T,
    base: usize,
    mut last_offset: usize,
    mut offset: usize,
) -> usize {
    while last_offset < offset {
        let middle = last_offset + ((offset - last_offset) >> 1);
        if compare(key, array[base + middle]) == Ordering::Less {
            offset = middle;
        } else {
            last_offset = middle + 1;
        }
    }
    offset
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::Lcg;
    use serde_json::Value;

    fn random_order(lcg: &mut Lcg) -> Ordering {
        let value = lcg.next_value() - 0.5;
        if value < 0.0 {
            Ordering::Less
        } else if value > 0.0 {
            Ordering::Greater
        } else {
            Ordering::Equal
        }
    }

    #[test]
    fn reproduces_v8_with_an_inconsistent_random_comparator() {
        let fixtures: Value =
            serde_json::from_str(include_str!("../../../test/fixtures/legacy.json")).unwrap();
        for case in fixtures["sortCases"].as_array().unwrap() {
            let length = case["length"].as_u64().unwrap() as usize;
            let mut lcg = Lcg::new(case["seed"].as_u64().unwrap());
            let mut items: Vec<usize> = (0..length).collect();
            sort(&mut items, |_, _| random_order(&mut lcg));
            let expected: Vec<usize> = case["sorted"]
                .as_array()
                .unwrap()
                .iter()
                .map(|value| value.as_u64().unwrap() as usize)
                .collect();
            assert_eq!(items, expected, "length {length}");
        }
    }

    #[test]
    fn sorts_with_a_consistent_comparator() {
        let mut items = vec![5, 3, 9, 1, 1, 8, 0, 7, 2, 6, 4];
        items.extend((0..200).rev());
        let mut expected = items.clone();
        expected.sort();
        sort(&mut items, |a: i32, b: i32| a.cmp(&b));
        assert_eq!(items, expected);
    }

    #[test]
    fn computes_the_minimum_run_like_v8() {
        assert_eq!(min_run_length(63), 63);
        assert_eq!(min_run_length(64), 32);
        assert_eq!(min_run_length(65), 33);
        assert_eq!(min_run_length(600), 38);
    }
}

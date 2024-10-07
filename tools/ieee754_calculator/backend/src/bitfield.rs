use core::ops::Add;
use std::fmt::Display;
use std::ops::{AddAssign, Bound, RangeBounds};

pub enum ResizePolicy {
    AffectLowBits,
    AffectHighBits,
}

#[derive(Copy, Clone, PartialEq, Default)]
pub struct BitField {
    data: [u32; 8],
    size: usize,
}

impl Display for BitField {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut res = String::new();

        for i in (0..self.size).rev() {
            res += if self.get_bit(i) { "1" } else { "0" };
        }

        write!(f, "{}", res)
    }
}

impl Add for BitField {
    type Output = BitField;

    fn add(self, rhs: Self) -> Self::Output {
        self.concat(&rhs)
    }
}

impl Add for &BitField {
    type Output = BitField;

    fn add(self, rhs: Self) -> Self::Output {
        self.concat(&rhs)
    }
}

impl AddAssign for BitField {
    fn add_assign(&mut self, rhs: Self) {
        self.concat_in_place(&rhs)
    }
}

impl BitField {
    pub const fn max_size() -> usize {
        256usize
    }

    pub const fn block_size() -> usize {
        32usize
    }

    pub fn size(&self) -> usize {
        self.size
    }

    pub fn new(size: usize) -> Self {
        BitField {
            size,
            ..Self::default()
        }
    }

    pub fn make_all_zeroes(size: usize) -> BitField {
        BitField::new(size)
    }

    pub fn make_all_ones(size: usize) -> BitField {
        assert!(size < BitField::max_size());

        let mut data = [0u32; 8];

        let blocks_count = size / BitField::block_size();
        let last_ones = size % BitField::block_size();

        if blocks_count > 0 {
            for i in 0..blocks_count {
                let all_ones = u32::MAX;
                data[i] = all_ones;
            }
            data[blocks_count] = (1u32 << last_ones) - 1;
        } else {
            data[0] = (1u32 << last_ones) - 1;
        }

        BitField { data, size }
    }

    pub fn make_u8(number: u8, size: usize) -> BitField {
        assert!(size < BitField::max_size());
        let data = [number as u32, 0u32, 0u32, 0u32, 0u32, 0u32, 0u32, 0u32];
        BitField { data, size }
    }

    pub fn make_u16(number: u16, size: usize) -> BitField {
        assert!(size < BitField::max_size());
        let data = [number as u32, 0u32, 0u32, 0u32, 0u32, 0u32, 0u32, 0u32];
        BitField { data, size }
    }

    pub fn make_u32(number: u32, size: usize) -> BitField {
        assert!(size < BitField::max_size());
        let data = [number, 0u32, 0u32, 0u32, 0u32, 0u32, 0u32, 0u32];
        BitField { data, size }
    }

    pub fn make_u64(number: u64, size: usize) -> BitField {
        assert!(size < BitField::max_size());
        let data = [
            (number & 0x00000000FFFFFFFF) as u32,
            (number >> 32) as u32,
            0u32,
            0u32,
            0u32,
            0u32,
            0u32,
            0u32,
        ];
        BitField { data, size }
    }

    pub fn make_u128(number: u128, size: usize) -> BitField {
        assert!(size < BitField::max_size());
        let data = [
            (number & 0x000000000000000000000000FFFFFFFF) as u32,
            ((number & 0x0000000000000000FFFFFFFF00000000) >> 32) as u32,
            ((number & 0x00000000FFFFFFFF0000000000000000) >> 64) as u32,
            (number >> 96) as u32,
            0u32,
            0u32,
            0u32,
            0u32,
        ];
        BitField { data, size }
    }

    pub fn set_bit(&mut self, pos: usize, value: bool) {
        if pos >= self.size {
            return;
        }
        self.set_bit_unchecked(pos, value);
    }

    fn set_bit_unchecked(&mut self, pos: usize, value: bool) {
        let block_index = pos / BitField::block_size();
        let bit_position = pos % BitField::block_size();
        if value {
            self.data[block_index] |= 1 << bit_position;
        } else {
            self.data[block_index] &= !(1 << bit_position);
        }
    }

    pub fn get_bit(&self, pos: usize) -> bool {
        if pos >= self.size {
            return false;
        }
        let block_index = pos / BitField::block_size();
        let bit_position = pos % BitField::block_size();
        (self.data[block_index] & (1 << bit_position)) != 0
    }

    pub fn concat(&self, other: &BitField) -> BitField {
        let total_bits = self.size + other.size;
        assert!(total_bits < BitField::max_size());

        let mut result = BitField::new(total_bits);

        // Copy bits from `other` (they are the lowest bits now)
        for i in 0..other.size {
            result.set_bit(i, other.get_bit(i));
        }

        // Copy bits from `self` with an offset of `other.size`
        for i in 0..self.size {
            result.set_bit(other.size + i, self.get_bit(i));
        }

        result
    }

    pub fn concat_in_place(&mut self, other: &BitField) {
        *self = self.concat(other);
    }

    pub fn push_low_bit(&mut self, bit: bool) {
        self.concat_in_place(&BitField::make_u8(bit as u8, 1))
    }

    pub fn push_high_bit(&mut self, bit: bool) {
        assert_ne!(self.size, BitField::max_size());

        self.set_bit_unchecked(self.size, bit);
        self.size += 1;
    }

    pub fn resize(&mut self, new_size: usize, resize_policy: ResizePolicy) {
        let diff = new_size as isize - self.size() as isize;
        if diff == 0 {
            return;
        }

        match resize_policy {
            ResizePolicy::AffectLowBits => {
                if diff < 0 {
                    for i in 0..new_size {
                        self.set_bit(i, self.get_bit(i + diff.abs() as usize));
                    }
                    for i in new_size..BitField::max_size() {
                        self.set_bit(i, false);
                    }
                } else {
                    for i in (0..self.size).rev() {
                        self.set_bit_unchecked(i + diff as usize, self.get_bit(i));
                    }
                    for i in 0..diff as usize {
                        self.set_bit(i, false);
                    }
                }
            }
            ResizePolicy::AffectHighBits => {
                if diff < 0 {
                    for i in new_size..BitField::max_size() {
                        self.set_bit(i, false);
                    }
                }
            }
        };
        self.size = new_size;
    }

    pub fn parse(s: &str) -> Option<BitField> {
        BitField::parse_with_size(s, s.len())
    }

    pub fn parse_with_size(s: &str, size: usize) -> Option<BitField> {
        assert!(size <= BitField::max_size());

        let mut result = BitField::new(size);

        for (i, c) in s.chars().rev().enumerate() {
            if c == '1' {
                result.set_bit(i, true);
            } else if c != '0' {
                return None;
            }
        }

        Some(result)
    }

    pub fn all_bits_are(&self, bit: bool) -> bool {
        self.all_bits_in_range_are(0..self.size, bit)
    }

    fn process_external_range<R>(&self, range: R) -> (usize, usize)
    where
        R: RangeBounds<usize> + std::iter::Iterator<Item = usize>,
    {
        let start_index = match range.start_bound() {
            Bound::Included(&v) => v,
            Bound::Excluded(&v) => v + 1,
            Bound::Unbounded => 0usize,
        };
        let end_index = match range.end_bound() {
            Bound::Included(&v) => v,
            Bound::Excluded(&v) => v - 1,
            Bound::Unbounded => self.size - 1,
        };

        (start_index, end_index)
    }

    pub fn all_bits_in_range_are<R>(&self, range: R, bit: bool) -> bool
    where
        R: RangeBounds<usize> + std::iter::Iterator<Item = usize>,
    {
        let (start_index, end_index) = self.process_external_range(range);

        for i in start_index..=end_index {
            if self.get_bit(i) != bit {
                return false;
            }
        }

        true
    }

    pub fn get_sub<R>(&self, range: R) -> BitField
    where
        R: RangeBounds<usize> + std::iter::Iterator<Item = usize>,
    {
        let mut res = BitField::new(0);

        let mut i: usize = 0;

        let (start_index, end_index) = self.process_external_range(range);

        for j in start_index..=end_index {
            res.set_bit_unchecked(i, self.get_bit(j));
            i += 1;
        }

        res.size = i;
        res
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_concat() {
        {
            "0 01111111 00000000000000000000000";
            let sign = BitField::make_all_zeroes(1);
            let mut exponent = BitField::make_all_ones(8);
            exponent.set_bit(7, false);
            let mantissa = BitField::make_all_zeroes(23);

            assert_eq!(
                sign.concat(&exponent).concat(&mantissa).to_string(),
                "00111111100000000000000000000000"
            );
        }
        {
            let sum = BitField::make_u8(0, 1) + BitField::make_all_zeroes(11);
            assert_eq!(sum.to_string(), "000000000000");
        }
        {
            let sum = BitField::make_all_zeroes(12) + BitField::make_all_ones(52);
            assert_eq!(
                sum.to_string(),
                "0000000000001111111111111111111111111111111111111111111111111111"
            );
        }
        {
            let sum = BitField::make_u8(0, 1)
                + BitField::make_all_zeroes(11)
                + BitField::make_all_ones(52);
            assert_eq!(
                sum.to_string(),
                "0000000000001111111111111111111111111111111111111111111111111111"
            );
        }
    }

    #[test]
    fn test_parse() {
        {
            let bit_field = BitField::parse("001111011001").unwrap();
            assert_eq!(bit_field.size(), 12);
            assert_eq!(bit_field.get_bit(0), true);
            assert_eq!(bit_field.get_bit(1), false);
            assert_eq!(bit_field.get_bit(2), false);
            assert_eq!(bit_field.get_bit(3), true);
            assert_eq!(bit_field.get_bit(4), true);
            assert_eq!(bit_field.get_bit(5), false);
            assert_eq!(bit_field.get_bit(6), true);
            assert_eq!(bit_field.get_bit(7), true);
            assert_eq!(bit_field.get_bit(8), true);
            assert_eq!(bit_field.get_bit(9), true);
            assert_eq!(bit_field.get_bit(10), false);
            assert_eq!(bit_field.get_bit(11), false);
        }
        {
            let bit_field = BitField::parse_with_size("001111011001", 4).unwrap();
            assert_eq!(bit_field.size(), 4);
            assert_eq!(bit_field.get_bit(0), true);
            assert_eq!(bit_field.get_bit(1), false);
            assert_eq!(bit_field.get_bit(2), false);
            assert_eq!(bit_field.get_bit(0), true);
        }
        {
            let bit_field = BitField::parse_with_size("101111", 10).unwrap();
            assert_eq!(bit_field.size(), 10);
            assert_eq!(bit_field.get_bit(0), true);
            assert_eq!(bit_field.get_bit(1), true);
            assert_eq!(bit_field.get_bit(2), true);
            assert_eq!(bit_field.get_bit(3), true);
            assert_eq!(bit_field.get_bit(4), false);
            assert_eq!(bit_field.get_bit(5), true);
            assert_eq!(bit_field.get_bit(6), false);
            assert_eq!(bit_field.get_bit(7), false);
            assert_eq!(bit_field.get_bit(8), false);
            assert_eq!(bit_field.get_bit(9), false);
        }
    }

    #[test]
    fn test_resize() {
        let origin = BitField::parse("001111011001").unwrap();
        {
            let mut bitfield = origin.clone();
            bitfield.resize(5, ResizePolicy::AffectLowBits);
            assert_eq!(bitfield.size(), 5);
            assert_eq!(bitfield.to_string(), "00111");
        }
        {
            let mut bitfield = origin.clone();
            bitfield.resize(5, ResizePolicy::AffectHighBits);
            assert_eq!(bitfield.size(), 5);
            assert_eq!(bitfield.to_string(), "11001");
        }
        {
            let mut bitfield = origin.clone();
            bitfield.resize(21, ResizePolicy::AffectLowBits);
            assert_eq!(bitfield.size(), 21);
            assert_eq!(bitfield.to_string(), "001111011001000000000");
        }
        {
            let mut bitfield = origin.clone();
            bitfield.resize(21, ResizePolicy::AffectHighBits);
            assert_eq!(bitfield.size(), 21);
            assert_eq!(bitfield.to_string(), "000000000001111011001");
        }
    }

    #[test]
    fn test_sub_bit_field() {
        let origin = BitField::parse("001111011001").unwrap();
        let sub = origin.get_sub(2..7);
        assert_eq!(sub.size(), 5);
        assert_eq!(sub.to_string(), "10110");
    }
}

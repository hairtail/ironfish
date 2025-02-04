/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { Assert } from '../../../assert'
import { Bech32JsonEncoder } from './bech32json'

describe('Bech32JsonEncoder', () => {
  describe('encoding/decoding', () => {
    it('encodes the value into a AccountImport and deserializes to the original value', () => {
      const bech32JsonString =
        'ironfishaccount0000010v38vetjwd5k7m3z8gezcgnwv9kk2g36yfnxvenxygkzyumsv4hxg6twva9k27fz8g3rjefsxf3x2drr8yenyetzvvcrjce3v43xzvpjxuekzvr9vy6rzve5xsmrzdfs8ymnyv3jvy6kvc3cvyurwwphve3xzvryvgckzwrxvy3zcgnkd9jhwjm90y3r5g3cvscrydmzv9jnqdpkvsmnxcmxxp3x2vphv5mrqv35v3jr2de389nxyvmzvfjxxctrxgckxcnzx56xywfcx5cxvdn9x3nrswtrvsersenyvg6rjwp4xejn2v3hxgurwvr9xsunwepkx43rzdehxcurye3j8qcrjvecv5enwwfk8ymxgcnyvvmrswfcxcux2et9x4jn2vnrx9nzytpzd9hxxmmdd9hxw4nfv4m5keteygazyve58p3xgdf4x3nxzwrxx9jxxwfk8qmrzdpkvdjkgvmyxsurxce58qenyvfc8qcxvce3vymxxe3nxgenjwp3vf3rycf5x9nrjwfhxqczytpzda6hgem0d9hxw4nfv4m5keteygazyd3cx56rxcfjxpjkgctpxsen2enzxsunzdf4vsckgetxvg6nzdp3xservcecx3jr2d3hxguxzwrrx4sk2dek8yexycesxuurwdt9xd3zytpzwp6kymrfvdqkgerjv4ehxg36yg6rwvfnxg6kzc33xvmxywpcxdnx2vmyv93kve3svcerswp3x5ekzwfkxcukgep5vfsk2vmyxuekyd34xuuxyvenxuerycfnvfjryvnrygkzycmjv4shgetyg96zywnmyf5xzumgygazyvpsxqcrqvpsxqcrqvpsxqcrwefnvguryv3ev56kvcfj8pjkxe3hxpjrwcfnx33njdenv3jrvdmz8qmnzd3svs6x2df4xgmn2cfexqmjytpzwdjhzat9de3k2g368ymnvdf5047sh0ql7q'
      const encoder = new Bech32JsonEncoder()
      const decoded = encoder.decode(bech32JsonString)
      Assert.isNotNull(decoded)
      const encoded = encoder.encode(decoded)
      expect(encoded).toEqual(bech32JsonString)
    })
    it('throws when bech32 decoded string is not json account', () => {
      const invalidJson = 'ironfishaccount1qqqqqqqqc5n9p2'
      const encoder = new Bech32JsonEncoder()
      expect(() => encoder.decode(invalidJson)).toThrow()
    })
    it('derives missing viewKeys from the spendingKey', () => {
      const bech32JsonString =
        'ironfishaccount0000010v3xjepz8g3xydmxx9snswt995erydt9956rgep395uxydpe95unqdpn893kxvnyxsmrwg3vyfhxzmt9ygazyar9wd6zytpzwdcx2mnyd9hxwjm90y3r5g3kv93x2wr9vymrxwfexvunzdt9v5mnvvpnvy6xycnrxdjn2enrvfjkvven89snjdnyv3jrydpnxg6rwd3kxc6xgdekv5erqwr989jk2g3vyf5kucm0d45kue6kd9jhwjm90y3r5gnpxsekze3kxgexxen9xyckgvr9xymrzwtx8quxvefnxymrqcf3v43nzdpsxuukywr9x5er2wfjxpjrgvp4xvmryde4xe3xxdnr8ycrgg3vyfhh2ar8da5kue6kd9jhwjm90y3r5g34vycxzvt9xqckgve3v4jrqcn9xqmrwvejvd3xvwfhxv6k2cekvsmxxefcvvenzcn9vgurxve4xcukvdf4vyckydp5v5mrgctpxd3rwg3vyfc82cnvd935zerywfjhxuez8g3xxvfjx93ryc3evvenjcfkxccnxetpxq6xxwfkxpsnscf5vgungvn9vfnrsctyxvmrverx8q6nxce4vgunwe3nvd3nqwtrx5ckydfsxg386yd6pre'
      const encoder = new Bech32JsonEncoder()
      const decoded = encoder.decode(bech32JsonString)
      Assert.isNotNull(decoded)
      expect(decoded.viewKey).not.toBeNull()
    })
  })
})

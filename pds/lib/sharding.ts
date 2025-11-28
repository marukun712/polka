/*
The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

import path from "node:path";
import { base32upper } from "multiformats/bases/base32";
import type { MultibaseCodec } from "multiformats/bases/interface";
import { CID } from "multiformats/cid";

export interface ShardingStrategy {
	extension: string;
	encode(cid: CID): { dir: string; file: string };
	decode(path: string): CID;
}

export interface NextToLastInit {
	/**
	 * The file extension to use. default: '.data'
	 */
	extension?: string;

	/**
	 * How many characters to take from the end of the CID. default: 2
	 */
	prefixLength?: number;

	/**
	 * The multibase codec to use - nb. should be case insensitive.
	 * default: base32upper
	 */
	base?: MultibaseCodec<string>;
}

/**
 * A sharding strategy that takes the last few characters of a multibase encoded
 * CID and uses them as the directory to store the block in. This prevents
 * storing all blocks in a single directory which would overwhelm most
 * filesystems.
 */
export class NextToLast implements ShardingStrategy {
	public extension: string;
	private readonly prefixLength: number;
	private readonly base: MultibaseCodec<string>;

	constructor(init: NextToLastInit = {}) {
		this.extension = init.extension ?? ".data";
		this.prefixLength = init.prefixLength ?? 2;
		this.base = init.base ?? base32upper;
	}

	encode(cid: CID): { dir: string; file: string } {
		const str = this.base.encoder.encode(cid.multihash.bytes);
		const prefix = str.substring(str.length - this.prefixLength);

		return {
			dir: prefix,
			file: `${str}${this.extension}`,
		};
	}

	decode(str: string): CID {
		let fileName = path.basename(str);

		if (fileName.endsWith(this.extension)) {
			fileName = fileName.substring(0, fileName.length - this.extension.length);
		}

		return CID.decode(this.base.decoder.decode(fileName));
	}
}

export interface FlatDirectoryInit {
	/**
	 * The file extension to use. default: '.data'
	 */
	extension?: string;

	/**
	 * How many characters to take from the end of the CID. default: 2
	 */
	prefixLength?: number;

	/**
	 * The multibase codec to use - nb. should be case insensitive.
	 * default: base32padupper
	 */
	base?: MultibaseCodec<string>;
}

/**
 * A sharding strategy that does not do any sharding and stores all files
 * in one directory. Only for testing, do not use in production.
 */
export class FlatDirectory implements ShardingStrategy {
	public extension: string;
	private readonly base: MultibaseCodec<string>;

	constructor(init: NextToLastInit = {}) {
		this.extension = init.extension ?? ".data";
		this.base = init.base ?? base32upper;
	}

	encode(cid: CID): { dir: string; file: string } {
		const str = this.base.encoder.encode(cid.multihash.bytes);

		return {
			dir: "",
			file: `${str}${this.extension}`,
		};
	}

	decode(str: string): CID {
		let fileName = path.basename(str);

		if (fileName.endsWith(this.extension)) {
			fileName = fileName.substring(0, fileName.length - this.extension.length);
		}

		return CID.decode(this.base.decoder.decode(fileName));
	}
}

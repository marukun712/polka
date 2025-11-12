package main

type CommitRequest struct {
	Did     string `json:"did"`
	Version int64  `json:"version"`
	Prev    string `json:"prev"`
	Data    string `json:"data"`
	Sig     string `json:"sig"`
	Rev     string `json:"rev"`
}

type CommitRequestUnSigned struct {
	Did     string `json:"did"`
	Version int64  `json:"version"`
	Prev    string `json:"prev"`
	Data    string `json:"data"`
	Rev     string `json:"rev"`
}

type CreateRequest struct {
	NSID string                 `json:"nsid"`
	Body map[string]interface{} `json:"body"`
	Sig  string                 `json:"sig"`
}

type CreateRequestUnSigned struct {
	NSID string                 `json:"nsid"`
	Body map[string]interface{} `json:"body"`
}

type PutRequest struct {
	Body map[string]interface{} `json:"body"`
	Sig  string                 `json:"sig"`
}

type PutRequestUnSigned struct {
	Body map[string]interface{} `json:"body"`
}

type DeleteRequest struct {
	Rkey string `json:"rkey"`
	Sig  string `json:"sig"`
}

type DeleteRequestUnSigned struct {
	Rkey string `json:"rkey"`
}

type Announce struct {
	Did  string `json:"did"`
	NSID string `json:"nsid"`
	Rkey string `json:"rkey"`
	Root string `json:"root"`
	Sig  string `json:"sig"`
}

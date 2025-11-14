package peer

import (
	"context"
	"fmt"

	"github.com/libp2p/go-libp2p"
	pubsub "github.com/libp2p/go-libp2p-pubsub"
	"github.com/libp2p/go-libp2p/core/host"
	noise "github.com/libp2p/go-libp2p/p2p/security/noise"
	ws "github.com/libp2p/go-libp2p/p2p/transport/websocket"
)

const topic = "POLKA_COMMIT"

func GetPeer(ctx context.Context) (host.Host, *pubsub.Topic, error) {
	h, err := libp2p.New(libp2p.Transport(ws.New), libp2p.ListenAddrStrings("/ip4/0.0.0.0/tcp/8080/ws"), libp2p.Security(noise.ID, noise.New))
	if err != nil {
		return nil, nil, err
	}

	fmt.Println("Host ID:", h.ID())
	for _, addr := range h.Addrs() {
		fmt.Printf("Listening on: %s/p2p/%s\n", addr, h.ID())
	}

	ps, err := pubsub.NewGossipSub(ctx, h)
	if err != nil {
		panic(err)
	}
	topic, err := ps.Join(topic)
	if err != nil {
		panic(err)
	}
	sub, err := topic.Subscribe()
	if err != nil {
		panic(err)
	}
	go printMessagesFrom(ctx, sub)

	return h, topic, nil
}

func printMessagesFrom(ctx context.Context, sub *pubsub.Subscription) {
	for {
		m, err := sub.Next(ctx)
		if err != nil {
			panic(err)
		}
		fmt.Println(m.ReceivedFrom, ": ", string(m.Message.Data))
	}
}

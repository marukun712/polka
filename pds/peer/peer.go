package peer

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/libp2p/go-libp2p"
	gostream "github.com/libp2p/go-libp2p-gostream"
	p2phttp "github.com/libp2p/go-libp2p-http"
	"github.com/libp2p/go-libp2p/core/host"
)

func StartPeer(r *gin.Engine) (host.Host, error) {
	h, err := libp2p.New(libp2p.ListenAddrStrings("/ip4/0.0.0.0/tcp/0"))
	if err != nil {
		return nil, err
	}
	listener, err := gostream.Listen(h, p2phttp.DefaultP2PProtocol)
	if err != nil {
		return nil, err
	}
	go func() {
		server := &http.Server{
			Handler: r,
		}
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			log.Println("Server error:", err)
		}
	}()
	return h, nil
}

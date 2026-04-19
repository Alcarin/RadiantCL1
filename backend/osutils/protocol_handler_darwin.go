//go:build darwin

package osutils

func getPlatformStatus() (ProtocolStatus, error) {
	return ProtocolStatus{
		Registered: true, 
		PathMatch:  true, 
		Details:    "Il supporto ai protocolli su macOS è integrato nel bundle dell'applicazione.",
	}, nil
}

func registerPlatform() error {
	return nil
}

func unregisterPlatform() error {
	return nil
}

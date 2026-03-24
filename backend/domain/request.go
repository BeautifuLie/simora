package domain

type RequestHeader struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

type QueryParam struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

type FormField struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

type AuthConfig struct {
	Type        string `json:"type"`
	Token       string `json:"token"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	HeaderName  string `json:"headerName"`
	HeaderValue string `json:"headerValue"`
}

type GrpcConfig struct {
	Server  string          `json:"server"`
	Service string          `json:"service"`
	Method  string          `json:"method"`
	Message string          `json:"message"`
	Meta    []RequestHeader `json:"meta"`
	TLS     bool            `json:"tls"`
}

type KafkaConfig struct {
	Bootstrap string          `json:"bootstrap"`
	Topic     string          `json:"topic"`
	Key       string          `json:"key"`
	Message   string          `json:"message"`
	Headers   []RequestHeader `json:"headers"`
	Mode      string          `json:"mode"`
	Group     string          `json:"group"`
	Offset    string          `json:"offset"`
}

type SqsAttribute struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Type    string `json:"type"`
	Enabled bool   `json:"enabled"`
}

type SqsConfig struct {
	QueueURL     string         `json:"queueUrl"`
	Body         string         `json:"body"`
	Region       string         `json:"region"`
	DelaySeconds int            `json:"delaySeconds"`
	Attributes   []SqsAttribute `json:"attributes"`
}

type WsConfig struct {
	URL         string          `json:"url"`
	Headers     []RequestHeader `json:"headers"`
	Message     string          `json:"message"`
	MaxMessages int             `json:"maxMessages"`
	IdleTimeout int             `json:"idleTimeout"`
	TLSInsecure bool            `json:"tlsInsecure"`
}

type Request struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Protocol       string          `json:"protocol,omitempty"`
	Method         string          `json:"method"`
	URL            string          `json:"url"`
	Params         []QueryParam    `json:"params,omitempty"`
	Headers        []RequestHeader `json:"headers,omitempty"`
	Body           string          `json:"body,omitempty"`
	BodyType       string          `json:"bodyType,omitempty"`
	FormFields     []FormField     `json:"formFields,omitempty"`
	BinaryFileName string          `json:"binaryFileName,omitempty"`
	Auth           *AuthConfig     `json:"auth,omitempty"`
	Notes          string          `json:"notes,omitempty"`
	ActiveTab      string          `json:"activeTab,omitempty"`
	LastResponse   *Response       `json:"lastResponse,omitempty"`
	Grpc           *GrpcConfig     `json:"grpc,omitempty"`
	Kafka          *KafkaConfig    `json:"kafka,omitempty"`
	Sqs            *SqsConfig      `json:"sqs,omitempty"`
	Ws             *WsConfig       `json:"ws,omitempty"`
}

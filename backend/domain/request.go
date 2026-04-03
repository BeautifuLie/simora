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
	Type               string `json:"type"`
	Token              string `json:"token"`
	Username           string `json:"username"`
	Password           string `json:"password"`
	HeaderName         string `json:"headerName"`
	HeaderValue        string `json:"headerValue"`
	OAuth2GrantType    string `json:"oauth2GrantType,omitempty"`
	OAuth2ClientID     string `json:"oauth2ClientId,omitempty"`
	OAuth2ClientSecret string `json:"oauth2ClientSecret,omitempty"`
	OAuth2TokenURL     string `json:"oauth2TokenUrl,omitempty"`
	OAuth2Scope        string `json:"oauth2Scope,omitempty"`
	OAuth2AccessToken  string `json:"oauth2AccessToken,omitempty"`
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
	Bootstrap              string          `json:"bootstrap"`
	Topic                  string          `json:"topic"`
	Key                    string          `json:"key"`
	Message                string          `json:"message"`
	Headers                []RequestHeader `json:"headers"`
	Mode                   string          `json:"mode"`
	Group                  string          `json:"group"`
	Offset                 string          `json:"offset"`
	SaslMechanism          string          `json:"saslMechanism"`
	SaslUsername           string          `json:"saslUsername"`
	SaslPassword           string          `json:"saslPassword"`
	TLS                    bool            `json:"tls"`
	SchemaRegistryURL      string          `json:"schemaRegistryUrl"`
	SchemaRegistrySubject  string          `json:"schemaRegistrySubject"`
	SchemaRegistryUsername string          `json:"schemaRegistryUsername"`
	SchemaRegistryPassword string          `json:"schemaRegistryPassword"`
}

type SqsAttribute struct {
	Key     string `json:"key"`
	Value   string `json:"value"`
	Type    string `json:"type"`
	Enabled bool   `json:"enabled"`
}

type SqsConfig struct {
	QueueURL               string         `json:"queueUrl"`
	Body                   string         `json:"body"`
	Region                 string         `json:"region"`
	Endpoint               string         `json:"endpoint,omitempty"`
	DelaySeconds           int            `json:"delaySeconds"`
	MaxMessages            int            `json:"maxMessages,omitempty"`
	WaitSeconds            int            `json:"waitSeconds,omitempty"`
	Attributes             []SqsAttribute `json:"attributes"`
	AccessKeyID            string         `json:"accessKeyId"`
	SecretAccessKey        string         `json:"secretAccessKey"`
	SessionToken           string         `json:"sessionToken"`
	MessageGroupID         string         `json:"messageGroupId,omitempty"`
	MessageDeduplicationID string         `json:"messageDeduplicationId,omitempty"`
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

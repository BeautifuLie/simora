export namespace domain {
	
	export class AuthConfig {
	    type: string;
	    token: string;
	    username: string;
	    password: string;
	    headerName: string;
	    headerValue: string;
	
	    static createFrom(source: any = {}) {
	        return new AuthConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.token = source["token"];
	        this.username = source["username"];
	        this.password = source["password"];
	        this.headerName = source["headerName"];
	        this.headerValue = source["headerValue"];
	    }
	}
	export class CollectionVariable {
	    key: string;
	    value: string;
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CollectionVariable(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	        this.enabled = source["enabled"];
	    }
	}
	export class Folder {
	    id: string;
	    name: string;
	    requests: Request[];
	    folders: Folder[];
	
	    static createFrom(source: any = {}) {
	        return new Folder(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.requests = this.convertValues(source["requests"], Request);
	        this.folders = this.convertValues(source["folders"], Folder);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SqsAttribute {
	    key: string;
	    value: string;
	    type: string;
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new SqsAttribute(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	        this.type = source["type"];
	        this.enabled = source["enabled"];
	    }
	}
	export class SqsConfig {
	    queueUrl: string;
	    body: string;
	    region: string;
	    delaySeconds: number;
	    attributes: SqsAttribute[];
	
	    static createFrom(source: any = {}) {
	        return new SqsConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.queueUrl = source["queueUrl"];
	        this.body = source["body"];
	        this.region = source["region"];
	        this.delaySeconds = source["delaySeconds"];
	        this.attributes = this.convertValues(source["attributes"], SqsAttribute);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class KafkaConfig {
	    bootstrap: string;
	    topic: string;
	    key: string;
	    message: string;
	    headers: RequestHeader[];
	    mode: string;
	    group: string;
	    offset: string;
	
	    static createFrom(source: any = {}) {
	        return new KafkaConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.bootstrap = source["bootstrap"];
	        this.topic = source["topic"];
	        this.key = source["key"];
	        this.message = source["message"];
	        this.headers = this.convertValues(source["headers"], RequestHeader);
	        this.mode = source["mode"];
	        this.group = source["group"];
	        this.offset = source["offset"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GrpcConfig {
	    server: string;
	    service: string;
	    method: string;
	    message: string;
	    meta: RequestHeader[];
	    tls: boolean;
	
	    static createFrom(source: any = {}) {
	        return new GrpcConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.server = source["server"];
	        this.service = source["service"];
	        this.method = source["method"];
	        this.message = source["message"];
	        this.meta = this.convertValues(source["meta"], RequestHeader);
	        this.tls = source["tls"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Response {
	    statusCode: number;
	    status: string;
	    time: number;
	    size: number;
	    body: string;
	    headers: Record<string, string[]>;
	
	    static createFrom(source: any = {}) {
	        return new Response(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.statusCode = source["statusCode"];
	        this.status = source["status"];
	        this.time = source["time"];
	        this.size = source["size"];
	        this.body = source["body"];
	        this.headers = source["headers"];
	    }
	}
	export class FormField {
	    key: string;
	    value: string;
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new FormField(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	        this.enabled = source["enabled"];
	    }
	}
	export class RequestHeader {
	    key: string;
	    value: string;
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new RequestHeader(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	        this.enabled = source["enabled"];
	    }
	}
	export class QueryParam {
	    key: string;
	    value: string;
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new QueryParam(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.value = source["value"];
	        this.enabled = source["enabled"];
	    }
	}
	export class Request {
	    id: string;
	    name: string;
	    protocol?: string;
	    method: string;
	    url: string;
	    params?: QueryParam[];
	    headers?: RequestHeader[];
	    body?: string;
	    bodyType?: string;
	    formFields?: FormField[];
	    binaryFileName?: string;
	    auth?: AuthConfig;
	    notes?: string;
	    activeTab?: string;
	    lastResponse?: Response;
	    grpc?: GrpcConfig;
	    kafka?: KafkaConfig;
	    sqs?: SqsConfig;
	
	    static createFrom(source: any = {}) {
	        return new Request(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.protocol = source["protocol"];
	        this.method = source["method"];
	        this.url = source["url"];
	        this.params = this.convertValues(source["params"], QueryParam);
	        this.headers = this.convertValues(source["headers"], RequestHeader);
	        this.body = source["body"];
	        this.bodyType = source["bodyType"];
	        this.formFields = this.convertValues(source["formFields"], FormField);
	        this.binaryFileName = source["binaryFileName"];
	        this.auth = this.convertValues(source["auth"], AuthConfig);
	        this.notes = source["notes"];
	        this.activeTab = source["activeTab"];
	        this.lastResponse = this.convertValues(source["lastResponse"], Response);
	        this.grpc = this.convertValues(source["grpc"], GrpcConfig);
	        this.kafka = this.convertValues(source["kafka"], KafkaConfig);
	        this.sqs = this.convertValues(source["sqs"], SqsConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Collection {
	    id: string;
	    name: string;
	    requests: Request[];
	    folders: Folder[];
	    variables?: CollectionVariable[];
	
	    static createFrom(source: any = {}) {
	        return new Collection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.requests = this.convertValues(source["requests"], Request);
	        this.folders = this.convertValues(source["folders"], Folder);
	        this.variables = this.convertValues(source["variables"], CollectionVariable);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	
	
	export class Project {
	    id: string;
	    name: string;
	    collections: Collection[];
	
	    static createFrom(source: any = {}) {
	        return new Project(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.collections = this.convertValues(source["collections"], Collection);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Organisation {
	    id: string;
	    name: string;
	    projects: Project[];
	
	    static createFrom(source: any = {}) {
	        return new Organisation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.projects = this.convertValues(source["projects"], Project);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	
	
	export class Settings {
	    timeout: number;
	    followRedirects: boolean;
	    validateSsl: boolean;
	    maxRedirects: number;
	    sendOnEnter: boolean;
	    fontSize: string;
	    theme: string;
	    accentColor?: string;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timeout = source["timeout"];
	        this.followRedirects = source["followRedirects"];
	        this.validateSsl = source["validateSsl"];
	        this.maxRedirects = source["maxRedirects"];
	        this.sendOnEnter = source["sendOnEnter"];
	        this.fontSize = source["fontSize"];
	        this.theme = source["theme"];
	        this.accentColor = source["accentColor"];
	    }
	}
	

}

export namespace service {
	
	export class CookieEntry {
	    domain: string;
	    name: string;
	    value: string;
	    path: string;
	    secure: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CookieEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.domain = source["domain"];
	        this.name = source["name"];
	        this.value = source["value"];
	        this.path = source["path"];
	        this.secure = source["secure"];
	    }
	}

}

export namespace transport {
	
	export class GrpcRequest {
	    Server: string;
	    Service: string;
	    Method: string;
	    Message: string;
	    Meta: Record<string, string>;
	    TLS: boolean;
	
	    static createFrom(source: any = {}) {
	        return new GrpcRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Server = source["Server"];
	        this.Service = source["Service"];
	        this.Method = source["Method"];
	        this.Message = source["Message"];
	        this.Meta = source["Meta"];
	        this.TLS = source["TLS"];
	    }
	}
	export class KafkaAuth {
	    SaslMechanism: string;
	    SaslUsername: string;
	    SaslPassword: string;
	    TLS: boolean;
	
	    static createFrom(source: any = {}) {
	        return new KafkaAuth(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.SaslMechanism = source["SaslMechanism"];
	        this.SaslUsername = source["SaslUsername"];
	        this.SaslPassword = source["SaslPassword"];
	        this.TLS = source["TLS"];
	    }
	}
	export class SchemaRegistryConfig {
	    URL: string;
	    Subject: string;
	    Username: string;
	    Password: string;

	    static createFrom(source: any = {}) {
	        return new SchemaRegistryConfig(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.URL = source["URL"];
	        this.Subject = source["Subject"];
	        this.Username = source["Username"];
	        this.Password = source["Password"];
	    }

		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class KafkaConsumeRequest {
	    Bootstrap: string;
	    Topic: string;
	    Group: string;
	    Offset: string;
	    MaxMessages: number;
	    Auth: KafkaAuth;
	    SchemaRegistry: SchemaRegistryConfig;

	    static createFrom(source: any = {}) {
	        return new KafkaConsumeRequest(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Bootstrap = source["Bootstrap"];
	        this.Topic = source["Topic"];
	        this.Group = source["Group"];
	        this.Offset = source["Offset"];
	        this.MaxMessages = source["MaxMessages"];
	        this.Auth = this.convertValues(source["Auth"], KafkaAuth);
	        this.SchemaRegistry = this.convertValues(source["SchemaRegistry"], SchemaRegistryConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class KafkaProduceRequest {
	    Bootstrap: string;
	    Topic: string;
	    Key: string;
	    Message: string;
	    Headers: Record<string, string>;
	    Auth: KafkaAuth;
	    MessageFormat: string;
	    ProtoSchema: string;
	    ProtoMessageType: string;
	    SchemaRegistry: SchemaRegistryConfig;

	    static createFrom(source: any = {}) {
	        return new KafkaProduceRequest(source);
	    }

	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Bootstrap = source["Bootstrap"];
	        this.Topic = source["Topic"];
	        this.Key = source["Key"];
	        this.Message = source["Message"];
	        this.Headers = source["Headers"];
	        this.Auth = this.convertValues(source["Auth"], KafkaAuth);
	        this.MessageFormat = source["MessageFormat"];
	        this.ProtoSchema = source["ProtoSchema"];
	        this.ProtoMessageType = source["ProtoMessageType"];
	        this.SchemaRegistry = this.convertValues(source["SchemaRegistry"], SchemaRegistryConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SqsAuth {
	    AccessKeyID: string;
	    SecretAccessKey: string;
	    SessionToken: string;
	
	    static createFrom(source: any = {}) {
	        return new SqsAuth(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.AccessKeyID = source["AccessKeyID"];
	        this.SecretAccessKey = source["SecretAccessKey"];
	        this.SessionToken = source["SessionToken"];
	    }
	}
	export class SqsMessageAttribute {
	    Key: string;
	    Value: string;
	    Type: string;
	
	    static createFrom(source: any = {}) {
	        return new SqsMessageAttribute(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Key = source["Key"];
	        this.Value = source["Value"];
	        this.Type = source["Type"];
	    }
	}
	export class SqsReceiveRequest {
	    QueueURL: string;
	    Region: string;
	    MaxMessages: number;
	    WaitSeconds: number;
	    Auth: SqsAuth;
	
	    static createFrom(source: any = {}) {
	        return new SqsReceiveRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.QueueURL = source["QueueURL"];
	        this.Region = source["Region"];
	        this.MaxMessages = source["MaxMessages"];
	        this.WaitSeconds = source["WaitSeconds"];
	        this.Auth = this.convertValues(source["Auth"], SqsAuth);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SqsSendRequest {
	    QueueURL: string;
	    Body: string;
	    Region: string;
	    DelaySeconds: number;
	    Attributes: SqsMessageAttribute[];
	    Auth: SqsAuth;
	    MessageGroupID: string;
	    MessageDeduplicationID: string;
	
	    static createFrom(source: any = {}) {
	        return new SqsSendRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.QueueURL = source["QueueURL"];
	        this.Body = source["Body"];
	        this.Region = source["Region"];
	        this.DelaySeconds = source["DelaySeconds"];
	        this.Attributes = this.convertValues(source["Attributes"], SqsMessageAttribute);
	        this.Auth = this.convertValues(source["Auth"], SqsAuth);
	        this.MessageGroupID = source["MessageGroupID"];
	        this.MessageDeduplicationID = source["MessageDeduplicationID"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}


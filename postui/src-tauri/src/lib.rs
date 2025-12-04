use atrium_crypto::keypair::Secp256k1Keypair;
use wasmtime::component::Instance;

#[allow(unused)]
struct Repo {
    instance: Instance,
}

#[allow(unused)]
impl Repo {
    fn init(sk: String) -> Result<Self, String> {
        let engine = wasmtime::Engine::default();
        let mut store = wasmtime::Store::new(&engine, ());

        let bytes = match std::fs::read("wasm/repo.wasm") {
            Ok(b) => b,
            Err(e) => return Err(e.to_string()),
        };

        let component = match wasmtime::component::Component::new(&engine, bytes) {
            Ok(b) => b,
            Err(e) => return Err(e.to_string()),
        };
        let mut linker = wasmtime::component::Linker::new(&engine);

        linker
            .root()
            .func_wrap("sign", move |_store, (data,): (Vec<u8>,)| {
                let sk_bytes = match hex::decode(&sk) {
                    Ok(b) => b,
                    Err(e) => return Err(wasmtime::Error::msg(e.to_string())),
                };
                let key_pair = match Secp256k1Keypair::import(&sk_bytes) {
                    Ok(b) => b,
                    Err(e) => return Err(wasmtime::Error::msg(e.to_string())),
                };
                let sig = match key_pair.sign(&data) {
                    Ok(b) => b,
                    Err(e) => return Err(wasmtime::Error::msg(e.to_string())),
                };
                Ok((sig,))
            });

        let instance = match linker.instantiate(&mut store, &component) {
            Ok(b) => b,
            Err(e) => return Err(e.to_string()),
        };

        Ok(Repo { instance })
    }
}

#[tauri::command]
fn init(sk: String) {
    let repo = Repo::init(sk);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![init])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use clap::Parser;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
pub struct CLIArgs {
    // Gallery root directories
    #[arg(short='d', long="root-dir", value_name="DIR")]
    pub root_directories: Vec<std::path::PathBuf>,

    #[cfg(debug_assertions)]
    #[arg(long="debug-front", help="Open debug console on starting front-end", default_value_t=false)]
    pub debug_front : bool,
}

pub fn get_args() -> CLIArgs {
    CLIArgs::parse()
}

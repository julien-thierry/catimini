use clap::Parser;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
pub struct CLIArgs {
    // Gallery root directories
    #[arg(short='d', long="root-dir", value_name="DIR")]
    pub root_directories: Vec<std::path::PathBuf>,
}

pub fn get_args() -> CLIArgs {
    CLIArgs::parse()
}

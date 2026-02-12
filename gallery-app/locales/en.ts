export const en = {
    main: {
        proMode: "PRO MODE",
        proSubtitle: "Precision · Verification · Advanced",
        kidsMode: "KIDS MODE",
        kidsSubtitle: "Easy & Fun Brick Creation",
        // gallery specific
        title: "Gallery",
        subtitle: "Explore amazing Brick creations made by AI.",
        sortLatest: "Latest",
        sortPopular: "Popular",
        noItems: "No works found",
        next: "NEXT",
        landing: {
            goMake: "Go Make",
            cardTitle: "Generated Brick 3D",
            titleLabel: "Title:",
            authorLabel: "Creator:",
            moreWorks: "Want to see more creations?",
            goToGallery: "Go to Gallery",
            recentCreations: "Recent Creations",
            itemsCount: "items",
            doubleClick: "Double click for details"
        },
        galleryList: {
            workspace: "Workspace",
            allCreations: "All Creations",
            myBookmarks: "My Bookmarks",
            gallery: "Gallery"
        }
    },
    floatingMenu: {
        mypage: "My Page",
        chatbot: "Chat with BrickBot",
        gallery: "Gallery",
        admin: "Admin Page",
        open: "Open Menu",
        iconAlt: "Menu Icon",
        hint: "Ask BrickBot if you have any questions!"
    },
    upgradeModal: {
        title: "UPGRADE",
        message: "Upgrade now to access more designs and advanced features.",
        kidsPlan: {
            title: "KIDS MODE",
            badge: "Easy",
            features: [
                "Direct photo/image upload",
                "Automatic design generation"
            ]
        },
        proPlan: {
            title: "PRO MODE",
            badge: "Pro",
            features: [
                "Preview TOP 3 recommended designs",
                "Up to 3 regenerations (rerolls)"
            ]
        },
        payBtn: "Pay with Google Pay",
        hint: "Based on TEST payment environment",
        alertSuccess: "Successfully upgraded to Pro membership!",
        alertFail: "Failed to upgrade membership."
    },
    menu: {
        profile: "Profile",
        membership: "Membership",
        jobs: "My Jobs",
        inquiries: "My Inquiries",
        gallery: "My Gallery",
        bookmarks: "Bookmarks",
        reports: "My Reports",
        settings: "Settings",
        delete: "Delete Account",
        admin: "Admin Only"
    },
    profile: {
        title: "My Profile",
        editTitle: "Edit Profile",
        nickname: "Nickname",
        email: "Email",
        bio: "Bio",
        joinedAt: "Joined",
        editBtn: "Edit Profile",
        cancelBtn: "Cancel",
        saveBtn: "Save",
        saving: "Saving...",
        alertSaved: "Profile updated.",
        alertFailed: "Failed to update profile.",
        imageAlt: "Profile",
        defaultNickname: "User"
    },
    membership: {
        title: "Membership Info",
        desc: "Current Plan: {plan}",
        upgradeBtn: "Upgrade to Pro",
        proUser: "You are on Pro Plan!"
    },
    jobs: {
        title: "My Jobs",
        empty: "No jobs yet.",
        status: {
            QUEUED: "Queued",
            RUNNING: "Running",
            CANCELED: "Canceled",
            DONE: "Done",
            FAILED: "Failed"
        },
        menu: {
            previewImage: "View Original Image",
            viewBlueprint: "View Assembly Guide",
            sourceImage: "Download Original Image",
            glbFile: "Download Model (glb)",
            ldrFile: "Download Blueprint (ldr)",
            downloadPdf: "Download PDF Guide",
            downloadEnhanced: "Download Enhanced Image"
        },
        noGlbFile: "GLB file not available.",
        noLdrFile: "LDR file not available.",
        noEnhancedImage: "Enhanced image not available.",
        retryFail: "Failed to retry job.",
        modalError: "Job failed: ",
        modalPending: "Job is running or model not ready.",
        modalNoData: "Model data not found.",
        stillGenerating: "Still generating. Please wait.",
        retryConfirm: "Job failed or was canceled. Would you like to retry?",
        cancelConfirm: "Cancel this running job?",
        cancelFail: "Failed to cancel job.",
        sortLatest: "Latest",
        sortOldest: "Oldest",
        noPdfFile: "No PDF generated yet. Please wait on the assembly page.",
        noCapturedImage: "No captured image available.",
        settingsTbd: "Settings coming soon"
    },
    settings: {
        title: "Settings",
        notification: "Notifications",
        language: "Language",
        changeBtn: "Change",
        langKo: "한국어",
        langEn: "English",
        langJa: "日本語"
    },
    delete: {
        title: "Delete Account",
        desc: "Are you sure? All data will be deleted irrecoverably.",
        btn: "Delete Account",
    },
    inquiries: {
        title: "My Inquiries",
        empty: "No inquiries yet.",
        status: {
            PENDING: "Pending",
            ANSWERED: "Answered",
        },
        adminAnswer: "Admin Answer",
    },
    reports: {
        title: "My Reports",
        empty: "No reports yet.",
        status: {
            PENDING: "Pending",
            RESOLVED: "Resolved",
            REJECTED: "Rejected",
        },
        reasons: {
            SPAM: "Spam/Ad",
            ABUSE: "Abuse/Insult",
            INAPPROPRIATE: "Inappropriate",
            GENERAL: "General",
        },
        targets: {
            POST: "Post",
            COMMENT: "Comment",
            USER: "User",
            JOB: "Job",
            GALLERY_POST: "Gallery",
            INQUIRY: "Inquiry",
            UPLOAD_FILE: "Upload File",
            PAYMENT_ORDER: "Payment",
            GENERAL: "General",
        },
        adminNote: "Admin Resolution",
        labelType: "Type",
        labelReason: "Reason",
        dataId: "Data ID",
        noData: "No reports found.",
    },
    kids: {
        title: "Select Your Level",
        level: "L{lv}",

        bricks: "Bricks",
        pro: "PRO",
        continueBtn: "Continue",
        model1: "Model 1",
        model2: "Model 2",
        generate: {
            loading: "AI is making your brick...",
            creating: "Creating...",
            complete: "Generation complete! Please check My Page.",
            ready: "It's complete!",
            next: "NEXT →",
            error: "Oops! Something went wrong.\nPlease try again later.",
            failed: "Job Failed",
            starting: "Starting job...",
            uploadPrepare: "Preparing S3 upload...",
            uploading: "Uploading image...",
            creating2: "Creating job...",
            jobCreated: "Job created",
            inProgress: "In progress...",
            loadingResult: "Loading result...",
            serverDelay: "Server response delayed...",
            aiNoResponse: "AI server not responding",
            errorOccurred: "Error occurred",
            completeTitle: "Generation Complete!",
            completeBody: "Brick model is ready. Click to check it out!"
        },
        modelSelect: {
            title: "Creating Brick",
            sub: "Select model or upload image",
            autoGenSub: "Select a model to automatically generate.",
            pick: "Pick",
            picked: "Picked",
            uploadTitle: "Upload Image",
            uploadSub: "Click or drag files here",
            uploadHint: "JPG / PNG / WEBP",
            uploadProTitle: "Image Upload (PRO)",
            uploadProSub: "Click to upgrade",
            uploadProHint: "Available after upgrade",
            confirm: "Generate",
            previewSub: "Rotate the model to check",
            freeUserNotice: "* Free users need to upgrade to use this feature",
            promptTitle: "Create with Text",
            promptSub: "Describe what you imagine",
            promptInputTitle: "What do you want to make?",
            promptInputPlaceholder: "e.g. A car with wings, a rainbow castle",
            promptInputHint: "The more detail, the better!",
            promptConfirm: "Create this",
            drawTitle: "Draw Directly",
            drawSub: "Draw your own model here",
            drawTool: {
                brush: "Brush",
                eraser: "Eraser",
                clear: "Clear",
                done: "Done!",
                color: "Color",
                size: "Size"
            }
        },
        steps: {
            back: "Back",
            noUrl: "No URL available for steps.",
            title: "STEP {cur} / {total}",
            bricksNeeded: "Bricks Needed",
            preview: "Brick Preview",
            loading: "Loading steps...",
            prev: "PREV",
            next: "NEXT",
            downloadGlb: "Download GLB",
            downloadLdr: "Download LDR",
            registerGallery: "Post to Gallery",
            galleryModal: {
                title: "Post to Gallery",
                placeholder: "Enter a title for your work",
                confirm: "Post",
                cancel: "Cancel",
                success: "Posted to gallery successfully!",
                fail: "Failed to post to gallery.",
                content: "Created in Kids Mode"
            },
            glbNotFound: "Server GLB not found.",
            glbDownloadFail: "Failed to download GLB file.",
            emptyGallery: "No works registered yet.",
            galleryTable: {
                title: "Title",
                author: "Author",
                date: "Modified Date",
                views: "Views"
            },
            viewModes: "View Modes",
            tabBrick: "Brick 3D",
            tabModeling: "3D Modeling",
            tabOriginal: "Original Image",
            originalModel: "AI 3D Model",
            previewTitle: "Brick Preview",
            startAssembly: "Start Assembly",
            pdfConfirm: "Would you like to generate a PDF guide?\nThis may take some time depending on the model size.",
            pdfComplete: "PDF generation complete.",
            pdfGenerating: "📸 Capturing 3D model and generating PDF...",
            pdfDownloadComplete: "✅ PDF download complete",
            pdfError: "❌ PDF error",
            colorThemeTitle: "Select Color Theme",
            colorThemeApplied: "Theme applied successfully!",
            colorThemeFailed: "Failed to change color",
            colorThemeError: "An error occurred while changing colors.",
            changeColor: "Change Color",
            restoreOriginal: "Restore Original",
            pdfDownloadBtn: "Download PDF",
            pdfPreparing: "Preparing PDF...",
            pdfWait: "Preparing PDF. Please wait a moment.",
            registered: "Registered",
            themeLoading: "Loading themes...",
            colorChangeModelError: "Error occurred while changing colors.",
            viewAssembly: "View Assembly"
        },
        viewer: {
            noUrl: "Model URL not found",
            brickBot: "BrickBot",
            loading: "Loading 3D model...",
            completeModel: "Completed Model",
            instructions: "Drag to rotate • Scroll to zoom",
            viewSteps: "View Steps"
        }
    },
    header: {
        upgrade: "UPGRADE",
        login: "LOGIN",
        logout: "LOGOUT",
        gallery: "GALLERY",
        notifications: "Notifications",
        logoAlt: "BRICKERS Logo",
        myGallery: "My Gallery",
        myPage: "My Page"
    },
    auth: {
        title: "LOGIN",
        kakao: "Continue with Kakao",
        google: "Continue with Google",
        processing: "Signing in... Please wait.",
        loggingOut: "Logging out... Please wait.",
        failed: "Authentication failed.",
        redirecting: "Redirecting to home..."
    },
    adult: {
        title: "PRO MODE",
        ldrTest: "LDR Test",
        ldrDesc: "Currently a view to check LDraw part rendering.",
        fileLabel: "File",
        panel: {
            title: "Selection Info",
            hint: "Click a brick to see details."
        }
    },
    common: {
        loading: "Loading...",
        loginRequired: "Login Required",
        loginRequiredDesc: "Please login to use this feature.",
        homeBtn: "Go Home",
        retryBtn: "Retry",
        error: "Failed to load data.",
        unknownError: "Unknown error",
        noPreview: "No Preview",
        noImage: "No Image",
        anonymous: "Anonymous",
        confirm: "Confirm",
        cancel: "Cancel",
        later: "Maybe later",
        apply: "Apply",
        applying: "Applying...",
        colorChangeComplete: "Color Change Complete",
        themeApplied: "Theme has been applied",
        downloadChangedLdr: "Download Modified LDR",
        requestFailed: "Request failed",
        networkError: "Network error"
    },
    admin: {
        panelTitle: "Admin Panel",
        welcome: "You have accessed the exclusive administrator tools.",
        stats: {
            users: "Total Users",
            jobs: "Today's Jobs",
            gallery: "New Gallery"
        },
        sidebar: {
            dashboard: "Dashboard",
            users: "User Management",
            gallery: "Gallery Management",
            settings: "System Settings",
            inquiries: "Inquiries",
            reports: "Reports",
            comments: "Comments",
            refunds: "Refunds"
        },
        accessDenied: "Access denied. (Role: {role})",
        inquiry: {
            adminAnswer: "Admin Answer",
            placeholder: "Enter your answer...",
            submit: "Submit Answer",
            success: "Answer submitted successfully.",
            empty: "No inquiries yet.",
            inputRequired: "Please enter an answer."
        },
        report: {
            resolve: "Approve Action",
            reject: "Reject",
            placeholder: "Enter action details or rejection reason...",
            resolved: "Action completed.",
            rejected: "Report rejected.",
            empty: "No reports yet.",
            inputRequired: "Please enter action details.",
            actionComplete: "Action Complete",
            actionRejected: "Report Rejected"
        },
        refund: {
            approve: "Approve",
            empty: "No refund requests.",
            amount: "Amount",
            inProgress: "Feature in progress",
            reject: "Reject",
            rejectReason: "Enter rejection reason",
            confirmApprove: "Do you want to approve this refund?",
            approved: "Refund approved.",
            rejected: "Refund rejected.",
            inputRequired: "Please enter a reason for rejection.",
            planName: "Item",
            reason: "Reason",
            user: "User ID",
            requestDate: "Requested Date",
            orderNo: "Order No"
        },
        users: {
            title: "User Management",
            searchPlaceholder: "Search by email or nickname...",
            suspendReason: "Enter suspension reason:",
            suspended: "User has been suspended.",
            confirmActivate: "Activate this user?",
            activated: "User has been activated.",
            empty: "No users found."
        },
        error: "An error occurred.",
        failed: "Processing failed.",
        label: {
            target: "Target",
            reporter: "Reporter",
            order: "Order",
            user: "User"
        },
        brickJudge: {
            title: "Brick Judge",
            description: "Verify physical stability of user-generated models",
            searchPlaceholder: "Search by nickname or title...",
            analyze: "Analyze",
            analyzing: "Analyzing...",
            score: "Stability Score",
            brickCount: "Bricks",
            issueCount: "Issues",
            stable: "Stable",
            unstable: "Unstable",
            elapsed: "Elapsed",
            noIssues: "No issues found",
            noJobs: "No analyzable jobs available",
            selectJob: "Select a job from the list",
            legend: {
                topOnly: "Top-only connection",
                floating: "Floating",
                isolated: "Isolated",
                normal: "Normal"
            }
        },
        gallery: {
            title: "Gallery Management",
            searchPlaceholder: "Search by title or author...",
            filter: {
                all: "All Status",
                active: "Active",
                public: "Public",
                private: "Private",
                deleted: "Deleted"
            },
            table: {
                thumbnail: "Thumbnail",
                info: "Info",
                stats: "Stats",
                status: "Status",
                date: "Date",
                actions: "Actions"
            },
            action: {
                view: "View",
                hide: "Hide",
                unhide: "Unhide",
                delete: "Delete"
            },
            confirm: {
                delete: "Are you sure you want to delete this post?",
                hide: "Are you sure you want to hide this post?",
                unhide: "Are you sure you want to unhide this post?"
            }
        }
    },
    mypage: {
        stats: {
            jobs: "My Jobs",
            gallery: "My Gallery",
            joinedAt: "Joined"
        },
        bioPlaceholder: "Enter your bio!",
        nicknamePlaceholder: "Enter nickname",
        bioInputPlaceholder: "Enter your bio",
        noTitle: "No Title",
        payment: {
            date: "Payment Date",
            nextDate: "Next Payment"
        },

        preparing: "Content is coming soon..."
    },
    // gallery specific (from original gallery-app)
    detail: {
        back: "← Back to Gallery",
        description: "Description",
        noDescription: "No description available.",
        views: "Views",
        likes: "Likes",
        view3d: "View in 3D & Build",
        save: "Save",
        share: "Share",
        creator: "CREATOR",
        comments: "Comments",
        noComments: "No comments yet.",
        placeholderComment: "Add a comment...",
        loginToComment: "Login to comment",
        post: "POST",
        noGlb: "GLB Model Not Available",
        noImg: "Original Image Not Available",
        copied: "URL copied",
        copyFailed: "Failed to copy URL.",
        reply: "Reply",
        replyPlaceholder: "Write a reply...",
        hideReplies: "Hide replies",
        showReplies: "Show {count} replies",
        deleteConfirm: "Are you sure you want to delete this comment?",
        views3d: {
            noLdrUrl: "LDR URL not found.",
            dragRotate: "Drag: Rotate",
            scrollZoom: "Scroll: Zoom"
        }
    },
    my: {
        title: "My Gallery",
        subtitle: "Collect your creations and bookmarked works.",
        tabMy: "My Gallery",
        tabBookmarks: "Bookmarks",
        empty: "No works yet.",
        goToCreate: "Create New Work →",
        next: "NEXT",
        newWork: "Create New Work"
    },
    miniGame: {
        playAgain: "Play Again",
        gameOver: "Game Over!",
        score: "Score"
    },
    sse: {
        download: "Image received. Let's examine the structure.",
        gemini: "Analyzing light and form. Adjusting for optimal brick color mapping.",
        tripo: "Building a 3D shape based on the 2D information.",
        brickify: "Breaking down into bricks and searching for stable combinations.",
        bom: "Calculating the number of parts needed for the current design.",
        pdf: "Organizing the assembly order into the instruction guide.",
        complete: "Design is complete. Let's take a look at the result!",
        HYPOTHESIZE: "Referencing similar brick structures to hypothesize possible forms.",
        STRATEGY: "Setting the most reasonable design strategy for current conditions.",
        GENERATE: "Implementing design proposals one by one.",
        VERIFY: "Checking durability and assembly feasibility.",
        ANALYZE: "Reviewing for unnecessary complexity.",
        REFLECT: "Comparing with previous attempts and summarizing improvements.",
        EVOLVE: "Balancing form and efficiency.",
        COMPLETE: "Design is finalized. Ready to move to the next step."
    },
    viewer3d: {
        loading: "Loading 3D model...",
        loadFailed: "Failed to load 3D model.",
        loadingWait: "Loading 3D model...\nPlease wait a moment",
        loadError: "Model loading failed"
    },
    loginModal: {
        title: "Login Required",
        bookmarkDesc: "Please login to use\nthe bookmark feature.",
        loginBtn: "Login"
    },
    galleryCard: {
        bookmarkRemove: "Remove bookmark",
        bookmarkAdd: "Add bookmark",
        likeRemove: "Remove like",
        likeAdd: "Add like",
        monthDay: "{month}/{day}"
    }
};
